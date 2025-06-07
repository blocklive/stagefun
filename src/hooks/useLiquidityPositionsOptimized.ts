import { useState, useCallback } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { CORE_TOKENS } from "@/lib/tokens/core-tokens";

// Structure to hold token information (same as original)
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Enhanced structure with TVL and reserve data
export interface LiquidityPosition {
  pairAddress: string;
  token0: TokenInfo;
  token1: TokenInfo;
  // New fields from database
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvlUsd?: number; // Calculated TVL in USD
  lastSyncTimestamp: Date;
}

// Interface for pool data from API
interface PoolData {
  lp_token_address: string;
  token_symbol: string;
  contract_address?: string;
}

// Function to fetch token symbol mapping from database (same as original)
const fetchTokenSymbolMapping = async (): Promise<Record<string, string>> => {
  try {
    // Fetch pool data from your API endpoint
    const response = await fetch("/api/pools");

    if (!response.ok) {
      throw new Error(`Failed to fetch pools: ${response.statusText}`);
    }

    const data = await response.json();

    // Create a mapping of token addresses to symbols
    const tokenSymbolMap: Record<string, string> = {};

    data.pools.forEach((pool: PoolData) => {
      if (pool.lp_token_address && pool.token_symbol) {
        tokenSymbolMap[pool.lp_token_address.toLowerCase()] = pool.token_symbol;
      }
    });

    console.log("📊 Loaded token symbol mapping:", tokenSymbolMap);
    return tokenSymbolMap;
  } catch (error) {
    console.error("Error fetching token symbol mapping:", error);
    return {};
  }
};

// Helper function to get token info with fallback (enhanced with database lookup)
const getTokenInfoWithFallback = (
  tokenAddress: string,
  tokenSymbolMap: Record<string, string>
): TokenInfo => {
  try {
    const normalizedAddress = tokenAddress.toLowerCase();

    // Check core tokens first
    const coreToken = CORE_TOKENS.find(
      (token) => token.address.toLowerCase() === normalizedAddress
    );

    if (coreToken) {
      return {
        address: tokenAddress,
        symbol: coreToken.symbol,
        name: coreToken.name,
        decimals: coreToken.decimals,
        logoURI: coreToken.logoURI,
      };
    }

    // Check our pool database mapping (this was missing!)
    if (tokenSymbolMap[normalizedAddress]) {
      const symbol = tokenSymbolMap[normalizedAddress];
      return {
        address: tokenAddress,
        symbol,
        name: symbol, // Use symbol as name if we don't have the name
        decimals: 18, // Default to 18 decimals
        logoURI: CORE_TOKENS.find((t) => t.symbol === symbol)?.logoURI,
      };
    }

    // Fallback for unknown tokens
    const shortAddress = tokenAddress.slice(0, 6);
    console.warn(`Using fallback data for unknown token ${tokenAddress}`);
    return {
      address: tokenAddress,
      symbol: shortAddress.toUpperCase(),
      name: `Token ${shortAddress}`,
      decimals: 18,
      logoURI: undefined,
    };
  } catch (error) {
    console.error(`Error getting token info for ${tokenAddress}:`, error);
    const shortAddress = tokenAddress.slice(0, 6);
    return {
      address: tokenAddress,
      symbol: shortAddress.toUpperCase(),
      name: `Token ${shortAddress}`,
      decimals: 18,
      logoURI: undefined,
    };
  }
};

// Function to calculate TVL in USD (simplified - you can enhance this)
const calculateTVL = (
  token0: TokenInfo,
  token1: TokenInfo,
  reserve0: string,
  reserve1: string,
  monPriceUsd: number = 0
): number => {
  try {
    // Parse reserves safely
    const reserve0Raw = parseFloat(reserve0) || 0;
    const reserve1Raw = parseFloat(reserve1) || 0;

    // If reserves are empty or invalid, return 0
    if (reserve0Raw <= 0 || reserve1Raw <= 0) {
      return 0;
    }

    // Convert from wei to human readable
    const reserve0Num = reserve0Raw / Math.pow(10, token0.decimals);
    const reserve1Num = reserve1Raw / Math.pow(10, token1.decimals);

    // For USDC pairs, TVL = 2 * USDC reserve (since other token should equal USDC value)
    if (token0.symbol === "USDC") {
      const tvl = reserve0Num * 2;
      return Math.max(0, tvl); // Ensure non-negative
    } else if (token1.symbol === "USDC") {
      const tvl = reserve1Num * 2;
      return Math.max(0, tvl); // Ensure non-negative
    }

    // For MON/WMON pairs, use actual MON price if available
    else if (monPriceUsd > 0) {
      if (token0.symbol === "MON" || token0.symbol === "WMON") {
        const tvl = reserve0Num * monPriceUsd * 2;
        return Math.max(0, tvl);
      } else if (token1.symbol === "MON" || token1.symbol === "WMON") {
        const tvl = reserve1Num * monPriceUsd * 2;
        return Math.max(0, tvl);
      }
    }

    // Fallback: No USDC or MON pair - assign $1 value per token
    // TVL = (token0 amount + token1 amount) * $1
    const tvl = reserve0Num + reserve1Num;
    return Math.max(0, tvl);
  } catch (error) {
    console.error("Error calculating TVL:", error);
    return 0;
  }
};

// Function to reorder tokens for better display (same logic as original)
const reorderTokensInPair = (
  position: LiquidityPosition
): LiquidityPosition => {
  const { token0, token1 } = position;

  // Priority order: Show USDC/MON/WMON second
  const isToken0Priority =
    token0.symbol === "USDC" ||
    token0.symbol === "MON" ||
    token0.symbol === "WMON";
  const isToken1Priority =
    token1.symbol === "USDC" ||
    token1.symbol === "MON" ||
    token1.symbol === "WMON";

  // Special case: USDC/WMON should show as WMON/USDC
  if (
    (token0.symbol === "USDC" && token1.symbol === "WMON") ||
    (token0.symbol === "WMON" && token1.symbol === "USDC")
  ) {
    if (token0.symbol === "USDC") {
      return {
        ...position,
        token0: token1, // WMON
        token1: token0, // USDC
        reserve0: position.reserve1, // Swap reserves too
        reserve1: position.reserve0,
      };
    }
    return position;
  }

  // If both are priority tokens, MON should come second
  if (isToken0Priority && isToken1Priority) {
    if (token0.symbol === "MON" && token1.symbol === "USDC") {
      return {
        ...position,
        token0: token1,
        token1: token0,
        reserve0: position.reserve1,
        reserve1: position.reserve0,
      };
    }
    return position;
  }

  // If only token0 is priority, swap them
  if (isToken0Priority && !isToken1Priority) {
    return {
      ...position,
      token0: token1,
      token1: token0,
      reserve0: position.reserve1,
      reserve1: position.reserve0,
    };
  }

  return position;
};

// Function to sort positions by first token symbol
const sortPositions = (positions: LiquidityPosition[]): LiquidityPosition[] => {
  return positions.sort((a, b) => {
    return a.token0.symbol.localeCompare(b.token0.symbol);
  });
};

// Main fetch function using database instead of on-chain queries
const fetchLiquidityPositionsFromDB = async (): Promise<
  LiquidityPosition[]
> => {
  try {
    console.time("DB liquidity positions fetch");
    console.log("🚀 Fetching liquidity positions from database...");

    // Fetch token symbol mapping from database (same as original)
    const tokenSymbolMap = await fetchTokenSymbolMapping();

    // Fetch all pairs from our amm_pairs table
    const { data: pairsData, error } = await supabase
      .from("amm_pairs")
      .select("*")
      .order("created_at_timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching pairs from database:", error);
      throw error;
    }

    if (!pairsData || pairsData.length === 0) {
      console.log("No pairs found in database");
      return [];
    }

    console.log(`📊 Found ${pairsData.length} pairs in database`);

    // First, find the MON price from WMON/USDC pair
    let monPriceUsd = 0;
    const wmonUsdcPair = pairsData.find((pair: any) => {
      const token0Info = getTokenInfoWithFallback(
        pair.token0_address as string,
        tokenSymbolMap
      );
      const token1Info = getTokenInfoWithFallback(
        pair.token1_address as string,
        tokenSymbolMap
      );

      return (
        (token0Info.symbol === "WMON" && token1Info.symbol === "USDC") ||
        (token0Info.symbol === "USDC" && token1Info.symbol === "WMON")
      );
    });

    if (wmonUsdcPair) {
      try {
        const token0Info = getTokenInfoWithFallback(
          wmonUsdcPair.token0_address as string,
          tokenSymbolMap
        );
        const token1Info = getTokenInfoWithFallback(
          wmonUsdcPair.token1_address as string,
          tokenSymbolMap
        );

        const reserve0 =
          parseFloat(wmonUsdcPair.reserve0) / Math.pow(10, token0Info.decimals);
        const reserve1 =
          parseFloat(wmonUsdcPair.reserve1) / Math.pow(10, token1Info.decimals);

        // Calculate MON price: USDC reserve / WMON reserve
        if (token0Info.symbol === "USDC" && reserve1 > 0) {
          monPriceUsd = reserve0 / reserve1;
        } else if (token1Info.symbol === "USDC" && reserve0 > 0) {
          monPriceUsd = reserve1 / reserve0;
        }

        console.log(
          `💰 MON price from WMON/USDC pair: $${monPriceUsd.toFixed(4)}`
        );
      } catch (error) {
        console.warn("Error calculating MON price:", error);
      }
    }

    // Transform database records to LiquidityPosition format
    const positions: LiquidityPosition[] = pairsData.map((pair: any) => {
      const token0Info = getTokenInfoWithFallback(
        pair.token0_address as string,
        tokenSymbolMap
      );
      const token1Info = getTokenInfoWithFallback(
        pair.token1_address as string,
        tokenSymbolMap
      );

      const position: LiquidityPosition = {
        pairAddress: pair.pair_address as string,
        token0: token0Info,
        token1: token1Info,
        reserve0: (pair.reserve0 as string) || "0",
        reserve1: (pair.reserve1 as string) || "0",
        totalSupply: (pair.total_supply as string) || "0",
        lastSyncTimestamp: new Date(
          (pair.last_sync_timestamp || pair.updated_at) as string
        ),
      };

      // Calculate TVL with MON price
      position.tvlUsd = calculateTVL(
        token0Info,
        token1Info,
        position.reserve0,
        position.reserve1,
        monPriceUsd
      );

      // Debug log for pools with issues
      if (
        token0Info.symbol.includes("pillnads") ||
        token0Info.symbol.includes("ShMON")
      ) {
        console.log(
          `🔍 TVL Debug for ${token0Info.symbol}/${token1Info.symbol}:`,
          {
            reserve0: position.reserve0,
            reserve1: position.reserve1,
            token0Decimals: token0Info.decimals,
            token1Decimals: token1Info.decimals,
            calculatedTVL: position.tvlUsd,
            token0Symbol: token0Info.symbol,
            token1Symbol: token1Info.symbol,
          }
        );
      }

      return position;
    });

    // Reorder and sort positions
    const reorderedPositions = positions.map(reorderTokensInPair);
    const sortedPositions = sortPositions(reorderedPositions);

    console.timeEnd("DB liquidity positions fetch");
    console.log(
      `✅ Successfully loaded ${sortedPositions.length} positions from database`
    );

    return sortedPositions;
  } catch (error) {
    console.error("Error fetching liquidity positions from database:", error);
    return [];
  }
};

export function useLiquidityPositionsOptimized() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use SWR to fetch and cache data from database
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "liquidity-positions-db",
    fetchLiquidityPositionsFromDB,
    {
      revalidateOnFocus: false,
      refreshInterval: 0, // Manual refresh only
      dedupingInterval: 5000, // 5 second deduping
      errorRetryCount: 2,
      errorRetryInterval: 2000,
      keepPreviousData: true,
    }
  );

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await mutate();
    } catch (error) {
      console.error("Error refreshing liquidity positions:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [mutate, isRefreshing]);

  return {
    positions: data || [],
    isLoading: isLoading || isRefreshing,
    isRefreshing: isValidating,
    error,
    refresh,
  };
}
