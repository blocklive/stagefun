"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useSmartWallet } from "./useSmartWallet";
import { ZerionSDK } from "../lib/zerion/ZerionSDK";
import { LP_TOKEN_MULTIPLIER } from "../lib/contracts/StageDotFunPool";

// Initialize the Zerion SDK
const zerionSDK = new ZerionSDK("dummy-key");

// LP token multiplier is defined in the contract as 1000
// When users deposit USDC, they receive 1000x that amount in LP tokens
// Example: 30 USDC deposit = 30,000 LP tokens
// Zerion API already returns the correct LP token amount with the multiplier applied,
// so we don't need to apply it again here.

/**
 * Custom hook to fetch and monitor a user's LP token balance using Zerion
 * More reliable than direct contract calls that may fail with embedded wallet issues
 *
 * @param lpTokenAddress The LP token contract address from the pool's lp_token_address field
 * @param lpTokenSymbol Optional symbol for display purposes only (not used for matching)
 */
export function useZerionLpBalance(
  lpTokenAddress: string | null | undefined,
  lpTokenSymbol?: string | null
) {
  const { smartWalletAddress } = useSmartWallet();
  const [error, setError] = useState<Error | null>(null);

  // Normalize the LP token address for comparison
  const normalizedLpAddress = lpTokenAddress
    ? lpTokenAddress.toLowerCase()
    : null;

  // SWR fetcher function to get wallet assets from Zerion
  const fetcher = useCallback(
    async ([address, tokenAddr, symbol]: [
      string,
      string | null,
      string | null
    ]) => {
      try {
        if (!address || !tokenAddr) {
          return {
            balance: BigInt(0),
            formattedBalance: "0",
            displayBalance: "0",
            symbol: symbol || "LP",
          };
        }

        // Get all assets from Zerion
        const response = await zerionSDK.getWalletAssets(address);

        // Find the LP token in the assets list by exactly matching the contract address
        const lpAsset = response.data.find((asset) => {
          const implementation =
            asset.attributes.fungible_info?.implementations?.[0];

          // Match LP token by contract address
          return (
            implementation?.address &&
            implementation.address.toLowerCase() === tokenAddr
          );
        });

        // If LP token not found, return zero balance
        if (!lpAsset) {
          console.log(
            `LP token not found in Zerion assets. Address: ${tokenAddr}`
          );
          return {
            balance: BigInt(0),
            formattedBalance: "0",
            displayBalance: "0",
            symbol: symbol || "LP",
          };
        }

        // Extract the balance and token information
        const { fungible_info: token, quantity } = lpAsset.attributes;

        // Get the symbol
        const tokenSymbol = token.symbol || symbol || "LP";

        // Convert the balance to the right format
        const rawValue = quantity.float;
        const bigIntValue = BigInt(Math.floor(rawValue * 10 ** 6)); // Convert to BigInt with 6 decimal places

        // Don't apply the LP token multiplier since the value already includes it
        // Just return the raw value directly for display
        const displayValue = rawValue.toString();

        console.log("LP token balance fetched successfully from Zerion:", {
          lpTokenAddress: tokenAddr,
          symbol: tokenSymbol,
          balance: quantity.numeric,
          rawValue,
          displayValue,
        });

        return {
          balance: bigIntValue,
          formattedBalance: rawValue.toString(),
          displayBalance: displayValue,
          symbol: tokenSymbol,
        };
      } catch (error) {
        console.error("Error in Zerion LP balance fetcher:", error);
        setError(error as Error);
        return {
          balance: BigInt(0),
          formattedBalance: "0",
          displayBalance: "0",
          symbol: symbol || "LP",
        };
      }
    },
    []
  );

  // Use SWR to handle data fetching
  const { data, isLoading, mutate } = useSWR(
    smartWalletAddress && normalizedLpAddress
      ? [smartWalletAddress, normalizedLpAddress, lpTokenSymbol]
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      errorRetryCount: 3, // Retry 3 times on error
      dedupingInterval: 5000, // Don't call again within 5 seconds
    }
  );

  return {
    lpBalance: data?.balance || BigInt(0),
    formattedLpBalance: data?.formattedBalance || "0",
    displayLpBalance: data?.displayBalance || "0",
    lpSymbol: data?.symbol || lpTokenSymbol || "LP",
    isLoading,
    error,
    refreshLpBalance: () => mutate(),
  };
}
