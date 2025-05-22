import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { getFactoryContract, getPairContract } from "@/lib/contracts/StageSwap";
import { useTokenList } from "./useTokenList";
import { CORE_TOKENS } from "@/lib/tokens/core-tokens";

// Structure to hold token information
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Simplified structure for a liquidity position in list view
export interface LiquidityPosition {
  pairAddress: string;
  token0: TokenInfo;
  token1: TokenInfo;
}

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

// Function to reorder tokens in a pair for better display
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
    // Always show WMON first, USDC second
    if (token0.symbol === "USDC") {
      return {
        ...position,
        token0: token1, // WMON
        token1: token0, // USDC
      };
    }
    // Already in correct order (WMON/USDC)
    return position;
  }

  // If both are priority tokens, MON should come second
  if (isToken0Priority && isToken1Priority) {
    if (token0.symbol === "MON" && token1.symbol === "USDC") {
      // USDC/MON order
      return {
        ...position,
        token0: token1,
        token1: token0,
      };
    }
    // Keep existing order for other combinations
    return position;
  }

  // If only token0 is a priority token (USDC/MON/WMON), swap them
  if (isToken0Priority && !isToken1Priority) {
    return {
      ...position,
      token0: token1,
      token1: token0,
    };
  }

  // If only token1 is priority or neither is priority, keep original order
  return position;
};

// Function to sort positions by first token symbol
const sortPositions = (positions: LiquidityPosition[]): LiquidityPosition[] => {
  return positions.sort((a, b) => {
    return a.token0.symbol.localeCompare(b.token0.symbol);
  });
};

// Helper function to retry a promise multiple times with exponential backoff
async function retryPromise<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 500,
  context: string = "operation"
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`${context} failed (attempt ${attempt}/${retries}):`, error);

      if (attempt === retries) {
        throw lastError;
      }

      // Exponential backoff: 500ms, 1000ms, 2000ms
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}

// Enhanced function to process a single pair with comprehensive retry logic
async function processSinglePair(
  pairAddress: string,
  provider: any,
  allTokens: any[],
  tokenSymbolMap: Record<string, string>
): Promise<LiquidityPosition | null> {
  try {
    console.log(`Processing pair ${pairAddress}...`);

    // Get pair contract with retry
    const pairContract = await retryPromise(
      () => getPairContract(pairAddress, provider),
      3,
      300,
      `Getting pair contract for ${pairAddress}`
    );

    // Get token addresses with enhanced retry
    const [token0Address, token1Address] = await retryPromise(
      async () => {
        const [t0, t1] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);
        return [t0, t1];
      },
      4, // More retries for token address calls
      400,
      `Getting token addresses for pair ${pairAddress}`
    );

    // Validate token addresses
    if (
      !token0Address ||
      !token1Address ||
      !ethers.isAddress(token0Address) ||
      !ethers.isAddress(token1Address)
    ) {
      console.warn(
        `Invalid token addresses for pair ${pairAddress}: token0=${token0Address}, token1=${token1Address}`
      );
      return null;
    }

    // Get token info with fallback
    const token0Info = getTokenInfoWithFallback(
      token0Address,
      allTokens,
      tokenSymbolMap,
      pairAddress
    );
    const token1Info = getTokenInfoWithFallback(
      token1Address,
      allTokens,
      tokenSymbolMap,
      pairAddress
    );

    const position: LiquidityPosition = {
      pairAddress,
      token0: token0Info,
      token1: token1Info,
    };

    // Reorder tokens for better display
    const reorderedPosition = reorderTokensInPair(position);
    console.log(
      `✅ Successfully processed pair ${pairAddress}: ${reorderedPosition.token0.symbol}/${reorderedPosition.token1.symbol}`
    );

    return reorderedPosition;
  } catch (error) {
    console.error(
      `❌ Failed to process pair ${pairAddress} after all retries:`,
      error
    );
    return null;
  }
}

// Enhanced getTokenInfo function with better fallback handling
const getTokenInfoWithFallback = (
  tokenAddress: string,
  allTokens: any[],
  tokenSymbolMap: Record<string, string>,
  pairAddress?: string
): TokenInfo => {
  try {
    // Check core tokens first
    const normalizedAddress = tokenAddress.toLowerCase();
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

    // Check our token list from useTokenList hook
    const knownToken = allTokens.find(
      (token) => token.address.toLowerCase() === normalizedAddress
    );
    if (knownToken) {
      return {
        address: tokenAddress,
        symbol: knownToken.symbol,
        name: knownToken.name,
        decimals: knownToken.decimals,
        logoURI: knownToken.logoURI,
      };
    }

    // Check our pool database mapping
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

    // Enhanced fallback for unknown tokens
    const shortAddress = tokenAddress.slice(0, 6);
    console.warn(
      `Using fallback data for unknown token ${tokenAddress} in pair ${
        pairAddress || "unknown"
      }`
    );
    return {
      address: tokenAddress,
      symbol: shortAddress.toUpperCase(),
      name: `Token ${shortAddress}`,
      decimals: 18,
      logoURI: CORE_TOKENS.find((t) => t.symbol === shortAddress.toUpperCase())
        ?.logoURI,
    };
  } catch (error) {
    console.error(`Error getting token info for ${tokenAddress}:`, error);
    // Ultimate fallback
    const shortAddress = tokenAddress.slice(0, 6);
    return {
      address: tokenAddress,
      symbol: shortAddress.toUpperCase(),
      name: `Token ${shortAddress}`,
      decimals: 18,
      logoURI: CORE_TOKENS.find((t) => t.symbol === shortAddress.toUpperCase())
        ?.logoURI,
    };
  }
};

export function useLiquidityPositions() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get all known tokens from our token list - make it optional
  const { allTokens = [] } = useTokenList();

  // Main fetch function for liquidity positions
  const fetchLiquidityPositions = async (
    walletAddress: string
  ): Promise<LiquidityPosition[]> => {
    try {
      console.time("Total loading time");
      console.log("Starting liquidity positions fetch...");
      console.log("Available tokens count:", allTokens.length);

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

      // STEP 1: Get all pair addresses with robust retry logic
      console.time("Get all pairs");
      const pairAddresses: string[] = [];
      const failedIndices: number[] = [];

      // Create array of indices to process
      const indices = Array.from({ length: Number(pairsLength) }, (_, i) => i);
      console.log(`🔄 Retrieving ${indices.length} pair addresses...`);

      // First pass: Try to get all pairs in batches
      const batchSize = 3; // Smaller batches for better reliability
      for (let i = 0; i < indices.length; i += batchSize) {
        const batch = indices.slice(i, i + batchSize);
        console.log(
          `Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            indices.length / batchSize
          )}: indices ${batch[0]}-${batch[batch.length - 1]}`
        );

        const batchPromises = batch.map(async (index) => {
          try {
            return await retryPromise(
              async () => {
                const pairAddress = await factoryContract.allPairs(index);
                if (pairAddress && ethers.isAddress(pairAddress)) {
                  console.log(`✅ Got pair ${index}: ${pairAddress}`);
                  return { index, address: pairAddress };
                }
                console.warn(
                  `⚠️ Invalid pair address at index ${index}: ${pairAddress}`
                );
                return { index, address: null };
              },
              4, // More retries for critical address retrieval
              400,
              `Getting pair address at index ${index}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to get pair ${index} after retries:`,
              error
            );
            return { index, address: null };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Process results and track failures
        for (const result of batchResults) {
          if (result.address) {
            pairAddresses.push(result.address);
          } else {
            failedIndices.push(result.index);
          }
        }
      }

      // Second pass: Retry failed indices individually with maximum retries
      if (failedIndices.length > 0) {
        console.warn(
          `🔄 Retrying ${failedIndices.length} failed pair addresses individually...`
        );

        for (const index of failedIndices) {
          try {
            const result = await retryPromise(
              async () => {
                const pairAddress = await factoryContract.allPairs(index);
                if (pairAddress && ethers.isAddress(pairAddress)) {
                  return pairAddress;
                }
                throw new Error(`Invalid address: ${pairAddress}`);
              },
              6, // Maximum retries for failed pairs
              1000, // Longer delay for problematic calls
              `Final retry for pair at index ${index}`
            );

            pairAddresses.push(result);
            console.log(`✅ Recovered pair ${index}: ${result}`);
          } catch (error) {
            console.error(
              `❌ PERMANENTLY FAILED to get pair at index ${index}:`,
              error
            );
          }
        }
      }

      console.timeEnd("Get all pairs");
      console.log(
        `Successfully retrieved ${pairAddresses.length} of ${pairsLength} pairs`
      );

      // Alert if we still lost pairs
      if (pairAddresses.length < Number(pairsLength)) {
        console.error(
          `🚨 CRITICAL: Lost ${
            Number(pairsLength) - pairAddresses.length
          } pairs during address retrieval!`
        );
      }

      if (pairAddresses.length === 0) {
        console.warn("No valid pairs found. Returning empty array.");
        return [];
      }

      // STEP 2: Process pairs with better tracking and validation
      console.time("Process all pairs");
      const positions: LiquidityPosition[] = [];
      let successCount = 0;
      let failureCount = 0;

      console.log(`🔄 Processing ${pairAddresses.length} pairs...`);

      for (let i = 0; i < pairAddresses.length; i++) {
        const pairAddress = pairAddresses[i];
        try {
          const position = await processSinglePair(
            pairAddress,
            provider,
            allTokens,
            tokenSymbolMap
          );
          if (position) {
            positions.push(position);
            successCount++;
          } else {
            failureCount++;
            console.warn(`⚠️ Pair ${pairAddress} returned null position`);
          }
        } catch (error) {
          failureCount++;
          console.error(
            `❌ Critical failure processing pair ${pairAddress}:`,
            error
          );
          // Continue with next pair - don't let one failure stop the whole process
        }

        // Progress logging every 5 pairs
        if ((i + 1) % 5 === 0 || i === pairAddresses.length - 1) {
          console.log(
            `📊 Progress: ${i + 1}/${
              pairAddresses.length
            } pairs checked, ${successCount} successful, ${failureCount} failed`
          );
        }
      }

      console.timeEnd("Process all pairs");
      console.log(
        `✅ Final results: ${successCount} successful pairs, ${failureCount} failed pairs`
      );

      // Validate we haven't lost pairs compared to what we found
      if (successCount < pairAddresses.length * 0.9) {
        console.warn(
          `⚠️ WARNING: Lost more than 10% of pairs! Expected: ${pairAddresses.length}, Got: ${successCount}`
        );
      }

      // Sort positions by first token symbol
      const sortedPositions = sortPositions(positions);

      console.timeEnd("Total loading time");
      console.log(`Successfully loaded ${sortedPositions.length} positions`);
      return sortedPositions;
    } catch (error) {
      console.error("Error fetching liquidity positions:", error);
      return [];
    }
  };

  // Use SWR to fetch and cache data with better caching settings
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    smartWalletAddress ? `liquidity-positions-${smartWalletAddress}` : null,
    async () => {
      if (!smartWalletAddress) return [];
      return fetchLiquidityPositions(smartWalletAddress);
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Increased to 60 seconds to reduce load
      dedupingInterval: 10000, // Increased deduping interval
      errorRetryCount: 1, // Reduced retry count
      revalidateIfStale: false, // Don't revalidate if data is stale
      revalidateOnReconnect: false, // Don't revalidate on reconnect
      keepPreviousData: true, // Keep previous data while fetching new data
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
