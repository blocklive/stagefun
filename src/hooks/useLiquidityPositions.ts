import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { getFactoryContract, getPairContract } from "@/lib/contracts/StageSwap";

// Structure to hold token information
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Simplified structure for a liquidity position in list view
export interface LiquidityPosition {
  pairAddress: string;
  token0: TokenInfo;
  token1: TokenInfo;
}

// Known token info hardcoded for common tokens
const KNOWN_TOKENS: Record<string, TokenInfo> = {
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
  [CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase()]: {
    address: CONTRACT_ADDRESSES.monadTestnet.officialWmon,
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
  },
};

// Hardcoded mapping of known pair addresses to token addresses
// This avoids having to call the pair contract to get token0/token1
const KNOWN_PAIRS: Record<string, { token0: string; token1: string }> = {
  // Add any known pairs here
  // Example format:
  // "0x1234...": { token0: "0xToken0Address", token1: "0xToken1Address" },
};

// Interface for the pool data from the database
interface PoolData {
  lp_token_address: string;
  token_symbol: string;
  contract_address?: string;
}

// Function to fetch pool data from our database
const fetchPoolsData = async (): Promise<Record<string, string>> => {
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

    return tokenSymbolMap;
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return {};
  }
};

// Function to get token info using our pool data or hardcoded values
const getTokenInfo = (
  tokenAddress: string,
  tokenSymbolMap: Record<string, string>
): TokenInfo => {
  // Check hardcoded tokens first
  const normalizedAddress = tokenAddress.toLowerCase();
  if (KNOWN_TOKENS[normalizedAddress]) {
    return KNOWN_TOKENS[normalizedAddress];
  }

  // Check our pool database mapping
  if (tokenSymbolMap[normalizedAddress]) {
    const symbol = tokenSymbolMap[normalizedAddress];
    return {
      address: tokenAddress,
      symbol,
      name: symbol, // Use symbol as name if we don't have the name
      decimals: 18, // Default to 18 decimals
    };
  }

  // Fallback for unknown tokens
  return {
    address: tokenAddress,
    symbol: `Token-${tokenAddress.slice(0, 6)}`,
    name: `Unknown Token ${tokenAddress.slice(0, 6)}`,
    decimals: 18,
  };
};

// Helper function to retry a promise multiple times
async function retryPromise<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 500
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryPromise(fn, retries - 1, delay);
  }
}

export function useLiquidityPositions() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Main fetch function for liquidity positions
  const fetchLiquidityPositions = async (
    walletAddress: string
  ): Promise<LiquidityPosition[]> => {
    try {
      console.time("Total loading time");
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      // Get token symbol mapping from our database
      const tokenSymbolMap = await fetchPoolsData();
      console.log("Loaded token symbol map from database:", tokenSymbolMap);

      // Get factory contract
      const factoryContract = await getFactoryContract(provider);

      // Get the number of pairs
      const pairsLength = await factoryContract.allPairsLength();
      console.log(`Found ${pairsLength} total pairs`);

      // STEP 1: Get all pair addresses in parallel batches
      console.time("Get all pairs");
      const batchSize = 5; // Reduce batch size to avoid rate limiting
      const pairAddresses: string[] = [];

      // Create array of indices to process
      const indices = Array.from({ length: Number(pairsLength) }, (_, i) => i);

      // Process in batches to avoid rate limiting
      for (let i = 0; i < indices.length; i += batchSize) {
        const batch = indices.slice(i, i + batchSize);
        const batchPromises = batch.map(async (index) => {
          try {
            // Retry up to 3 times with a 500ms delay
            return await retryPromise(
              async () => {
                const pairAddress = await factoryContract.allPairs(index);
                if (pairAddress && ethers.isAddress(pairAddress)) {
                  console.log(`Pair ${index} address: ${pairAddress}`);
                  return pairAddress;
                }
                return null;
              },
              3,
              500
            );
          } catch (error) {
            // Silent error handling
            return null;
          }
        });

        // Wait for this batch to complete
        const batchResults = await Promise.all(batchPromises);
        pairAddresses.push(
          ...(batchResults.filter((address) => address !== null) as string[])
        );
      }

      console.timeEnd("Get all pairs");
      console.log(
        `Successfully retrieved ${pairAddresses.length} of ${pairsLength} pairs`
      );

      if (pairAddresses.length === 0) {
        console.warn("No valid pairs found. Returning empty array.");
        return [];
      }

      // STEP 2: Get token info for each pair, one pair at a time to avoid failures
      console.time("Process all pairs");
      const positions: LiquidityPosition[] = [];

      for (const pairAddress of pairAddresses) {
        try {
          // Use try/catch for each pair to isolate failures
          console.log(`Processing pair ${pairAddress}`);
          const pairContract = await getPairContract(pairAddress, provider);

          try {
            // Special handling for USDC/MON pair which seems to fail most often
            // Retry the token calls up to 3 times with a 500ms delay
            let token0Address, token1Address;

            try {
              token0Address = await retryPromise(
                async () => {
                  return await pairContract.token0();
                },
                3,
                500
              );
            } catch (error) {
              // If all retries fail, skip this pair
              continue;
            }

            try {
              token1Address = await retryPromise(
                async () => {
                  return await pairContract.token1();
                },
                3,
                500
              );
            } catch (error) {
              // If all retries fail, skip this pair
              continue;
            }

            console.log(
              `Pair ${pairAddress} tokens: ${token0Address}, ${token1Address}`
            );

            // Get token info
            const token0Info = getTokenInfo(token0Address, tokenSymbolMap);
            const token1Info = getTokenInfo(token1Address, tokenSymbolMap);

            // Add to positions array
            positions.push({
              pairAddress,
              token0: token0Info,
              token1: token1Info,
            });

            console.log(
              `Successfully processed pair ${pairAddress}: ${token0Info.symbol}/${token1Info.symbol}`
            );
          } catch (error) {
            // Silent error handling
          }
        } catch (error) {
          // Silent error handling
        }
      }

      console.timeEnd("Process all pairs");
      console.timeEnd("Total loading time");
      console.log(`Successfully loaded ${positions.length} positions`);
      return positions;
    } catch (error) {
      console.error("Error fetching liquidity positions:", error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
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
