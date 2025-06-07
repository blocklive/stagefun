import { useMemo } from "react";
import { useWalletAssetsAdapter } from "./useWalletAssetsAdapter";
import { useSmartWallet } from "./useSmartWallet";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";

export interface UserLPPosition {
  // Pool information
  pairAddress: string;
  lpTokenAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;

  // User position
  lpTokenBalance: number;
  lpTokenBalanceFormatted: string;
  shareOfPool: number; // Percentage of total pool

  // Pool reserves and TVL
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvlUsd: number;

  // User's share of reserves
  userReserve0: number;
  userReserve1: number;
  userPositionValueUsd: number;
}

interface UseUserLPPositionsResult {
  positions: UserLPPosition[];
  totalValueUsd: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to get user's LP positions by combining:
 * 1. User's LP token balances from Alchemy (existing system)
 * 2. Pool data from AMM pairs database
 * 3. Token symbol mapping from /api/pools
 */
export function useUserLPPositions(): UseUserLPPositionsResult {
  const { smartWalletAddress } = useSmartWallet();

  // Get all user token balances (including LP tokens) using existing system
  const {
    assets,
    isLoading: balancesLoading,
    error: balancesError,
    refresh: refreshBalances,
  } = useWalletAssetsAdapter(smartWalletAddress, "monad-test-v2", {
    useZerion: false,
    combineData: false,
  });

  // Fetch all AMM pairs from database
  const {
    data: ammPairs,
    error: pairsError,
    mutate: refreshPairs,
  } = useSWR(
    "amm-pairs-all",
    async () => {
      const { data, error } = await supabase
        .from("amm_pairs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: true,
      keepPreviousData: true, // Keep showing cached data on error
    }
  );

  // Fetch token symbol mapping
  const { data: tokenMapping, error: mappingError } = useSWR(
    "token-symbol-mapping",
    async () => {
      try {
        const response = await fetch("/api/pools");
        if (!response.ok) throw new Error("Failed to fetch token mapping");
        const data = await response.json();

        console.log("Raw /api/pools response:", data);

        // Handle different response structures
        let pools = data;
        if (data && typeof data === "object") {
          // If response has a 'data' property, use that
          if (Array.isArray(data.data)) {
            pools = data.data;
          }
          // If response has a 'pools' property, use that
          else if (Array.isArray(data.pools)) {
            pools = data.pools;
          }
          // If the response itself is not an array, return empty mapping
          else if (!Array.isArray(data)) {
            console.warn("/api/pools returned non-array:", data);
            return {};
          }
        }

        if (!Array.isArray(pools)) {
          console.warn("/api/pools pools is not an array:", pools);
          return {};
        }

        // Create mapping from lp_token_address to token symbols
        const mapping: Record<
          string,
          { token0Symbol: string; token1Symbol: string }
        > = {};
        pools.forEach((pool: any) => {
          if (pool.lp_token_address && pool.token_symbol) {
            const [token0Symbol, token1Symbol] = pool.token_symbol.split("/");
            mapping[pool.lp_token_address.toLowerCase()] = {
              token0Symbol: token0Symbol?.trim() || "Unknown",
              token1Symbol: token1Symbol?.trim() || "Unknown",
            };
          }
        });

        console.log(
          "Created token mapping with",
          Object.keys(mapping).length,
          "entries"
        );
        return mapping;
      } catch (error) {
        console.warn("Error fetching token mapping:", error);
        // Return empty mapping instead of throwing to prevent error state
        return {};
      }
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: true,
      keepPreviousData: true, // Keep showing cached data on error
    }
  );

  // Process LP positions
  const positions = useMemo(() => {
    if (!assets || !ammPairs || !tokenMapping) return [];

    // First, find the MON price from WMON/USDC pair
    let monPriceUsd = 0;
    const wmonUsdcPair = ammPairs.find((pair) => {
      const token0Symbol =
        tokenMapping[pair.lp_token_address?.toLowerCase()]?.token0Symbol;
      const token1Symbol =
        tokenMapping[pair.lp_token_address?.toLowerCase()]?.token1Symbol;

      return (
        (token0Symbol === "WMON" && token1Symbol === "USDC") ||
        (token0Symbol === "USDC" && token1Symbol === "WMON")
      );
    });

    if (wmonUsdcPair) {
      try {
        const symbols =
          tokenMapping[wmonUsdcPair.lp_token_address?.toLowerCase()];
        if (symbols) {
          const reserve0 = parseFloat(wmonUsdcPair.reserve0 || "0");
          const reserve1 = parseFloat(wmonUsdcPair.reserve1 || "0");

          // Calculate MON price: USDC reserve / WMON reserve (assuming 18 decimals for both)
          if (symbols.token0Symbol === "USDC" && reserve1 > 0) {
            monPriceUsd = reserve0 / reserve1;
          } else if (symbols.token1Symbol === "USDC" && reserve0 > 0) {
            monPriceUsd = reserve1 / reserve0;
          }

          console.log(
            `💰 MON price from WMON/USDC pair: $${monPriceUsd.toFixed(4)}`
          );
        }
      } catch (error) {
        console.warn("Error calculating MON price:", error);
      }
    }

    const lpPositions: UserLPPosition[] = [];

    // Find LP tokens in user's assets
    assets.forEach((asset) => {
      const tokenAddress =
        asset.attributes.fungible_info?.implementations?.[0]?.address?.toLowerCase();
      if (!tokenAddress) return;

      // Find matching AMM pair by LP token address
      const ammPair = ammPairs.find(
        (pair) => pair.lp_token_address?.toLowerCase() === tokenAddress
      );

      if (!ammPair) return; // Not an LP token or not in our AMM system

      // Get token symbols from mapping
      const symbols = tokenMapping[tokenAddress];
      if (!symbols) return;

      // Get user's LP token balance
      const lpBalance = asset.attributes.quantity?.float || 0;
      if (lpBalance <= 0) return; // No position

      // Calculate user's share of the pool
      const totalSupply = parseFloat(ammPair.total_supply || "0");
      const shareOfPool = totalSupply > 0 ? (lpBalance / totalSupply) * 100 : 0;

      // Calculate user's share of reserves
      const reserve0 = parseFloat(ammPair.reserve0 || "0");
      const reserve1 = parseFloat(ammPair.reserve1 || "0");
      const userReserve0 = (reserve0 * lpBalance) / totalSupply;
      const userReserve1 = (reserve1 * lpBalance) / totalSupply;

      // Calculate TVL with improved pricing logic
      let tvlUsd = 0;
      const isUsdcPair =
        symbols.token0Symbol === "USDC" || symbols.token1Symbol === "USDC";
      const isMonPair =
        symbols.token0Symbol === "MON" ||
        symbols.token0Symbol === "WMON" ||
        symbols.token1Symbol === "MON" ||
        symbols.token1Symbol === "WMON";

      if (isUsdcPair) {
        // For USDC pairs: TVL = 2 × USDC reserve (assuming USDC = $1)
        const usdcReserve =
          symbols.token0Symbol === "USDC" ? reserve0 : reserve1;
        tvlUsd = usdcReserve * 2;
      } else if (isMonPair && monPriceUsd > 0) {
        // For MON/WMON pairs: use actual MON price
        const monReserve =
          symbols.token0Symbol === "MON" || symbols.token0Symbol === "WMON"
            ? reserve0
            : reserve1;
        tvlUsd = monReserve * monPriceUsd * 2;
      } else {
        // Fallback: give each token $1 value
        tvlUsd = reserve0 + reserve1;
      }

      // Calculate user's position value
      const userPositionValueUsd = (tvlUsd * shareOfPool) / 100;

      lpPositions.push({
        pairAddress: ammPair.pair_address,
        lpTokenAddress: ammPair.lp_token_address,
        token0Address: ammPair.token0_address,
        token1Address: ammPair.token1_address,
        token0Symbol: symbols.token0Symbol,
        token1Symbol: symbols.token1Symbol,
        lpTokenBalance: lpBalance,
        lpTokenBalanceFormatted: lpBalance.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6,
        }),
        shareOfPool,
        reserve0: ammPair.reserve0,
        reserve1: ammPair.reserve1,
        totalSupply: ammPair.total_supply,
        tvlUsd: Math.max(0, tvlUsd), // Ensure non-negative
        userReserve0,
        userReserve1,
        userPositionValueUsd: Math.max(0, userPositionValueUsd), // Ensure non-negative
      });
    });

    // Sort by position value (highest first)
    return lpPositions.sort(
      (a, b) => b.userPositionValueUsd - a.userPositionValueUsd
    );
  }, [assets, ammPairs, tokenMapping]);

  // Calculate total value
  const totalValueUsd = useMemo(() => {
    return positions.reduce(
      (sum, position) => sum + position.userPositionValueUsd,
      0
    );
  }, [positions]);

  // Only show loading if we don't have any data at all
  const isLoading =
    balancesLoading ||
    (!ammPairs && !pairsError) ||
    (!tokenMapping && !mappingError);

  // Only show error if we have no data and there's an error
  const hasError =
    (balancesError && !assets) ||
    (pairsError && !ammPairs) ||
    (mappingError && !tokenMapping);

  const refresh = () => {
    refreshBalances();
    refreshPairs();
  };

  // If no smart wallet address, return empty state
  if (!smartWalletAddress) {
    return {
      positions: [],
      totalValueUsd: 0,
      isLoading: false,
      error: null,
      refresh: () => {},
    };
  }

  return {
    positions,
    totalValueUsd,
    isLoading,
    error: hasError
      ? String(balancesError || pairsError || mappingError)
      : null,
    refresh,
  };
}
