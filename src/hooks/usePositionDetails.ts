import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { getERC20Contract } from "@/lib/contracts/StageSwap";

// Structure to hold token information (same as in useLiquidityPositions)
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Structure for detailed position information
export interface PositionDetails {
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
  totalSupply: string;
  isEmpty: boolean; // Flag to indicate if the pool is empty (both reserves are zero)
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

// Hook to fetch details for a specific position/pool
export function usePositionDetails(pairAddress: string | null) {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to get token info (symbol, name, decimals)
  const getTokenInfo = async (
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo> => {
    const normalizedAddress = tokenAddress.toLowerCase();
    if (knownTokens[normalizedAddress]) {
      return knownTokens[normalizedAddress];
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

      return {
        address: tokenAddress,
        symbol,
        name,
        decimals,
      };
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);

      // Always return something to prevent UI errors
      return {
        address: tokenAddress,
        symbol: `Token-${tokenAddress.slice(0, 6)}`,
        name: `Unknown Token ${tokenAddress.slice(0, 6)}`,
        decimals: 18,
      };
    }
  };

  // Function to fetch position details
  const fetchPositionDetails = async (
    pairAddress: string,
    walletAddress: string
  ): Promise<PositionDetails | null> => {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      console.log(
        `Fetching details for pair ${pairAddress} for wallet ${walletAddress}`
      );

      // Create pair contract instance
      const pairContract = new ethers.Contract(pairAddress, PairABI, provider);

      try {
        // Get token addresses
        const [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);
        console.log(`Pair tokens: ${token0Address}, ${token1Address}`);

        // Fetch token info
        const [token0Info, token1Info] = await Promise.all([
          getTokenInfo(token0Address, provider),
          getTokenInfo(token1Address, provider),
        ]);

        // Get user's LP token balance, total supply, and reserves
        const [lpBalance, totalSupply, reserves] = await Promise.all([
          pairContract.balanceOf(walletAddress),
          pairContract.totalSupply(),
          pairContract.getReserves(),
        ]);

        console.log(`LP balance: ${lpBalance.toString()}`);
        console.log(`Total supply: ${totalSupply.toString()}`);

        // Safe format to string
        const safeFormatUnits = (value: bigint, decimals: number): string => {
          try {
            return ethers.formatUnits(value, decimals);
          } catch (error) {
            console.error(`Error formatting value:`, error);
            return "0";
          }
        };

        // Format token amounts
        const reserve0 = safeFormatUnits(reserves[0], token0Info.decimals);
        const reserve1 = safeFormatUnits(reserves[1], token1Info.decimals);
        const lpTokenBalance = safeFormatUnits(lpBalance, 18);
        const totalSupplyFormatted = safeFormatUnits(totalSupply, 18);

        console.log(
          `Reserves: ${reserve0} ${token0Info.symbol}, ${reserve1} ${token1Info.symbol}`
        );

        // Check if pool is empty
        const reserve0Value = parseFloat(reserve0);
        const reserve1Value = parseFloat(reserve1);
        const isEmpty =
          (reserve0Value === 0 || reserve0Value < 0.0001) &&
          (reserve1Value === 0 || reserve1Value < 0.0001);

        // Calculate share of pool
        let shareOfPool = "0";
        if (lpBalance > 0 && totalSupply > 0) {
          try {
            // Convert to BigInt values for safe calculation
            const lpBalanceBigInt = ethers.toBigInt(lpBalance);
            const totalSupplyBigInt = ethers.toBigInt(totalSupply);

            // To calculate percentage with precision:
            // 1. Multiply lpBalance by 10000 (for 4 decimal precision)
            // 2. Divide by totalSupply
            // 3. Then divide by 100 to get percentage
            const scaleFactor = ethers.toBigInt(10000);
            const scaledShare =
              (lpBalanceBigInt * scaleFactor) / totalSupplyBigInt;

            // Convert to string and format - divide by 100 to get percentage
            shareOfPool = (
              Number(ethers.formatUnits(scaledShare, 0)) / 100
            ).toFixed(6);
          } catch (error) {
            console.error(`Error calculating share of pool:`, error);
            shareOfPool = "0"; // Fallback value
          }
        }

        // Calculate token amounts
        let amount0 = "0";
        let amount1 = "0";

        if (lpBalance > 0 && totalSupply > 0) {
          try {
            // First convert all values to ethers.js BigInt for safe calculations
            const lpBalanceBigInt = ethers.toBigInt(lpBalance);
            const totalSupplyBigInt = ethers.toBigInt(totalSupply);

            // Convert reserves to BigInt (these are string values from formatUnits)
            const reserve0BigInt = ethers.parseUnits(
              reserve0,
              token0Info.decimals
            );
            const reserve1BigInt = ethers.parseUnits(
              reserve1,
              token1Info.decimals
            );

            // Calculate token amounts directly from the proportions:
            // userAmount = reserveAmount * (userLP / totalLP)
            const amount0BigInt =
              (reserve0BigInt * lpBalanceBigInt) / totalSupplyBigInt;
            const amount1BigInt =
              (reserve1BigInt * lpBalanceBigInt) / totalSupplyBigInt;

            // Format to strings with proper decimals
            amount0 = ethers.formatUnits(amount0BigInt, token0Info.decimals);
            amount1 = ethers.formatUnits(amount1BigInt, token1Info.decimals);

            // Calculate and show user's share percentage using the BigInt value
            console.log(`User pool share: ${shareOfPool}%`);

            console.log(
              `Token amounts: ${amount0} ${token0Info.symbol}, ${amount1} ${token1Info.symbol}`
            );
          } catch (error) {
            console.error(`Error calculating token amounts:`, error);
            // Provide fallback values so UI doesn't break
            amount0 = "0";
            amount1 = "0";
          }
        }

        // When checking for lpBalance > 0 in the return value section, use string comparison
        // Check before we return the position details
        return {
          pairAddress,
          lpTokenBalance,
          shareOfPool,
          token0: token0Info,
          token1: token1Info,
          reserve0,
          reserve1,
          tokenAmounts: {
            amount0,
            amount1,
          },
          totalSupply: totalSupplyFormatted,
          isEmpty,
        };
      } catch (error) {
        console.error(`Error fetching position details:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Error initializing contract:`, error);
      return null;
    }
  };

  // Use SWR to fetch and cache data
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    pairAddress && smartWalletAddress
      ? `position-details-${pairAddress}-${smartWalletAddress}`
      : null,
    async () => {
      if (!pairAddress || !smartWalletAddress) return null;
      return fetchPositionDetails(pairAddress, smartWalletAddress);
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
    if (!pairAddress || !smartWalletAddress || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await mutate();
    } catch (error) {
      console.error("Error refreshing position details:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [pairAddress, smartWalletAddress, mutate, isRefreshing]);

  return {
    positionDetails: data,
    isLoading: isLoading || isRefreshing,
    isRefreshing: isValidating,
    error,
    refresh,
  };
}
