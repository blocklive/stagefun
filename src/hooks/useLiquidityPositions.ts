import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import {
  getFactoryContract,
  getERC20Contract,
} from "@/lib/contracts/StageSwap";

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
  hasUserLiquidity: boolean; // Flag to indicate if user has LP tokens in this pool
}

// Known token info cache
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

// Global token info cache to avoid repeated calls
const tokenInfoCache = new Map<string, TokenInfo>();

export function useLiquidityPositions() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to get token info (symbol, name, decimals)
  const getTokenInfo = async (
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo> => {
    // Check cache first
    if (tokenInfoCache.has(tokenAddress)) {
      return tokenInfoCache.get(tokenAddress)!;
    }

    const normalizedAddress = tokenAddress.toLowerCase();
    if (knownTokens[normalizedAddress]) {
      const tokenInfo = knownTokens[normalizedAddress];
      // Store in cache
      tokenInfoCache.set(tokenAddress, tokenInfo);
      return tokenInfo;
    }

    try {
      const tokenContract = await getERC20Contract(tokenAddress, provider);

      // Make individual calls and handle errors for each
      let symbol = `Token-${tokenAddress.slice(0, 6)}`;
      let name = `Unknown Token ${tokenAddress.slice(0, 6)}`;
      let decimals = 18;

      try {
        symbol = await tokenContract.symbol();
      } catch (error) {
        console.warn(`Error getting symbol for token ${tokenAddress}:`, error);
      }

      try {
        name = await tokenContract.name();
      } catch (error) {
        console.warn(`Error getting name for token ${tokenAddress}:`, error);
      }

      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(
          `Error getting decimals for token ${tokenAddress}:`,
          error
        );
      }

      console.log(
        `Token info for ${tokenAddress}: symbol=${symbol}, name=${name}, decimals=${decimals}`
      );

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

      // Always return something to prevent UI errors
      const fallbackInfo = {
        address: tokenAddress,
        symbol: `Token-${tokenAddress.slice(0, 6)}`,
        name: `Unknown Token ${tokenAddress.slice(0, 6)}`,
        decimals: 18,
      };

      // Still cache the fallback info to avoid repeated failed calls
      tokenInfoCache.set(tokenAddress, fallbackInfo);

      return fallbackInfo;
    }
  };

  // Main fetch function for liquidity positions - simplified to only get basic data
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

      // Loop through all pairs to get basic info
      for (let i = 0; i < Number(pairsLength); i++) {
        try {
          // Get pair address
          const pairAddress = await factoryContract.allPairs(i);
          console.log(`Pair ${i} address: ${pairAddress}`);

          try {
            // Create pair contract to get token addresses
            const pairABI = [
              "function token0() external view returns (address)",
              "function token1() external view returns (address)",
              "function balanceOf(address owner) view returns (uint)",
            ];
            const pairContract = new ethers.Contract(
              pairAddress,
              pairABI,
              provider
            );

            // Get token addresses
            const token0Address = await pairContract.token0();
            const token1Address = await pairContract.token1();
            console.log(`Pair ${i} tokens: ${token0Address}, ${token1Address}`);

            // Fetch token info
            const [token0Info, token1Info] = await Promise.all([
              getTokenInfo(token0Address, provider),
              getTokenInfo(token1Address, provider),
            ]);

            // Check if user has any LP tokens
            let hasUserLiquidity = false;
            try {
              const lpBalance = await pairContract.balanceOf(walletAddress);
              hasUserLiquidity = lpBalance > 0;
            } catch (error) {
              console.warn(
                `Error checking LP balance for ${pairAddress}:`,
                error
              );
            }

            // Add position to array
            positions.push({
              pairAddress,
              token0: token0Info,
              token1: token1Info,
              hasUserLiquidity,
            });
          } catch (error) {
            console.error(`Error processing pair ${i} data:`, error);
          }
        } catch (error) {
          console.error(`Error getting pair ${i} address:`, error);
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
