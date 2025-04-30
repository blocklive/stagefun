import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import {
  getFactoryContract,
  getERC20Contract,
} from "@/lib/contracts/StageSwap";

// LP token pair interface
const PairABI = [
  "function balanceOf(address owner) view returns (uint)",
  "function totalSupply() view returns (uint)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Structure to hold token information
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Structure for a liquidity position
export interface LiquidityPosition {
  pairAddress: string;
  lpTokenBalance: string;
  shareOfPool: string; // Percentage as string, e.g., "0.5"
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  tokenAmounts: {
    amount0: string;
    amount1: string;
  };
}

export function useLiquidityPositions() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cache for token info to avoid repeated contract calls
  const tokenInfoCache = new Map<string, TokenInfo>();

  // Function to get token info (symbol, name, decimals)
  const getTokenInfo = async (
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo> => {
    // Check cache first
    if (tokenInfoCache.has(tokenAddress)) {
      return tokenInfoCache.get(tokenAddress)!;
    }

    // Known tokens hardcoded for reliability
    const knownTokens: Record<string, TokenInfo> = {
      [CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase()]: {
        address: CONTRACT_ADDRESSES.monadTestnet.usdc,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
      [CONTRACT_ADDRESSES.monadTestnet.weth.toLowerCase()]: {
        address: CONTRACT_ADDRESSES.monadTestnet.weth,
        symbol: "MON",
        name: "Wrapped MON",
        decimals: 18,
      },
    };

    const normalizedAddress = tokenAddress.toLowerCase();
    if (knownTokens[normalizedAddress]) {
      const tokenInfo = knownTokens[normalizedAddress];
      // Store in cache
      tokenInfoCache.set(tokenAddress, tokenInfo);
      return tokenInfo;
    }

    try {
      const tokenContract = await getERC20Contract(tokenAddress, provider);

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
      ]);

      const tokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals,
      };

      // Store in cache
      tokenInfoCache.set(tokenAddress, tokenInfo);

      return tokenInfo;
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        symbol: "UNKNOWN",
        name: "Unknown Token",
        decimals: 18,
      };
    }
  };

  // Function to check if an address is a valid pair contract
  const isValidPairContract = async (
    pairAddress: string,
    provider: ethers.Provider
  ): Promise<boolean> => {
    // Known MON/USDC pair - bypass validation
    const knownPairs = [
      "0x58F634Df208a8329D60d995100f44e06cDEe8820", // MON-USDC pair
    ];

    if (knownPairs.includes(pairAddress)) {
      console.log(`Pair ${pairAddress} is a known pair, skipping validation`);
      return true;
    }

    try {
      // Try to create the contract instance
      const pairContract = new ethers.Contract(pairAddress, PairABI, provider);

      // Try calling some basic methods that a valid pair should have
      await Promise.all([
        pairContract.symbol().catch(() => null),
        pairContract.name().catch(() => null),
      ]);

      // If we got here without errors, there's a good chance it's a valid contract
      return true;
    } catch (error) {
      console.error(
        `Contract at ${pairAddress} is not a valid pair contract:`,
        error
      );
      return false;
    }
  };

  // Main fetch function for liquidity positions
  const fetchLiquidityPositions = async (
    walletAddress: string
  ): Promise<LiquidityPosition[]> => {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      // Get factory contract
      const factoryContract = await getFactoryContract(provider);

      // Get the number of pairs
      const pairsLength = await factoryContract.allPairsLength();
      console.log(`Found ${pairsLength} total pairs`);

      const positions: LiquidityPosition[] = [];

      // Known tokens (for better display)
      const usdcAddress = CONTRACT_ADDRESSES.monadTestnet.usdc;
      const wethAddress = CONTRACT_ADDRESSES.monadTestnet.weth;

      // Loop through all pairs to check if the user has LP tokens
      for (let i = 0; i < Number(pairsLength); i++) {
        let pairAddress = "";
        try {
          console.log(`Processing pair ${i}`);
          // Get pair address
          pairAddress = await factoryContract.allPairs(i);
          console.log(`Pair ${i} address: ${pairAddress}`);

          // Validate that this is a real pair contract before proceeding
          const isValid = await isValidPairContract(pairAddress, provider);
          if (!isValid) {
            console.warn(`Skipping invalid pair contract at ${pairAddress}`);
            continue;
          }

          // Create pair contract instance
          const pairContract = new ethers.Contract(
            pairAddress,
            PairABI,
            provider
          );

          // Get user's LP token balance
          let lpBalance;
          try {
            lpBalance = await pairContract.balanceOf(walletAddress);
            console.log(`LP balance for pair ${i}: ${lpBalance}`);
          } catch (balanceError) {
            console.error(
              `Error getting LP balance for pair ${i}:`,
              balanceError
            );
            continue; // Skip to next pair
          }

          // Calculate user's share of the pool
          let totalSupply;
          let shareOfPool = "0";
          try {
            totalSupply = await pairContract.totalSupply();
            console.log(`Total supply for pair ${i}: ${totalSupply}`);

            // Calculate share only if user has LP tokens
            if (lpBalance > 0) {
              shareOfPool = (
                (Number(ethers.formatUnits(lpBalance, 18)) /
                  Number(ethers.formatUnits(totalSupply, 18))) *
                100
              ).toFixed(6);
            }
          } catch (supplyError) {
            console.error(
              `Error getting total supply for pair ${i}:`,
              supplyError
            );
            continue;
          }

          // Get token addresses
          let token0Address, token1Address;
          try {
            [token0Address, token1Address] = await Promise.all([
              pairContract.token0(),
              pairContract.token1(),
            ]);
            console.log(`Pair ${i} tokens: ${token0Address}, ${token1Address}`);
          } catch (tokenError) {
            console.error(
              `Error getting token addresses for pair ${i}:`,
              tokenError
            );
            continue;
          }

          // Fetch token info
          let token0Info, token1Info;
          try {
            [token0Info, token1Info] = await Promise.all([
              getTokenInfo(token0Address, provider),
              getTokenInfo(token1Address, provider),
            ]);
          } catch (infoError) {
            console.error(`Error getting token info for pair ${i}:`, infoError);
            continue;
          }

          // Get reserves
          let reserves;
          try {
            reserves = await pairContract.getReserves();
          } catch (reservesError) {
            console.error(
              `Error getting reserves for pair ${i}:`,
              reservesError
            );
            continue;
          }

          const reserve0 = ethers.formatUnits(reserves[0], token0Info.decimals);
          const reserve1 = ethers.formatUnits(reserves[1], token1Info.decimals);

          // Calculate user's token amounts based on their share of the pool
          let amount0 = "0";
          let amount1 = "0";

          if (lpBalance > 0 && totalSupply > 0) {
            // First calculate the proportion of the pool the user owns
            const userPoolShare = Number(lpBalance) / Number(totalSupply);

            // Then multiply by the reserves and format to the appropriate decimals
            amount0 = (userPoolShare * Number(reserve0)).toFixed(
              token0Info.decimals
            );
            amount1 = (userPoolShare * Number(reserve1)).toFixed(
              token1Info.decimals
            );
          }

          // Add position to array
          positions.push({
            pairAddress,
            lpTokenBalance: ethers.formatUnits(lpBalance, 18),
            shareOfPool,
            token0: token0Info,
            token1: token1Info,
            reserve0,
            reserve1,
            tokenAmounts: {
              amount0,
              amount1,
            },
          });
        } catch (error) {
          console.error(`Error processing pair ${i}:`, error);
          // Continue to next pair
          continue;
        }
      }

      return positions;
    } catch (error) {
      console.error("Error fetching liquidity positions:", error);
      throw error;
    }
  };

  // Use SWR to fetch and cache data
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    smartWalletAddress ? `liquidity-positions-${smartWalletAddress}` : null,
    async () => {
      if (!smartWalletAddress) return [];
      return fetchLiquidityPositions(smartWalletAddress);
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe calls within 5 seconds
      errorRetryCount: 2,
    }
  );

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!smartWalletAddress || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await mutate();
    } catch (error) {
      console.error("Error refreshing liquidity positions:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [smartWalletAddress, mutate, isRefreshing]);

  return {
    positions: data || [],
    isLoading: isLoading || isRefreshing,
    isRefreshing: isValidating,
    error,
    refresh,
  };
}
