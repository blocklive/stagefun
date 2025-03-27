import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { getUSDCContract } from "../lib/contracts/StageDotFunPool";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useSmartWalletBalance() {
  const { smartWalletAddress } = useSmartWallet();

  // Add state to store the last successfully fetched balance
  const [cachedBalance, setCachedBalance] = useState<string>("0");
  const [isRpcError, setIsRpcError] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const retryCountRef = useRef(0);

  const getProvider = async () => {
    // Create a provider for Monad testnet
    return new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"
    );
  };

  const {
    data: balance,
    error,
    mutate,
  } = useSWR(
    // Only fetch when we have a smart wallet address
    smartWalletAddress
      ? ["smart-wallet-usdc-balance", smartWalletAddress]
      : null,
    async () => {
      try {
        setIsRpcError(false);
        setIsUsingCache(false);

        if (!smartWalletAddress) {
          return "0";
        }

        const provider = await getProvider();
        const usdcContract = getUSDCContract(provider);
        const balanceWei = await usdcContract.balanceOf(smartWalletAddress);
        const balance = ethers.formatUnits(balanceWei, 6); // USDC has 6 decimals

        // Store the successfully fetched balance in our cache
        setCachedBalance(balance);
        retryCountRef.current = 0; // Reset retry count on successful fetch

        return balance;
      } catch (error) {
        console.error("Error fetching smart wallet USDC balance:", error);

        // Set RPC error state
        setIsRpcError(true);

        // Implement retry logic
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          console.log(
            `Retrying smart wallet USDC balance fetch (${retryCountRef.current}/${MAX_RETRIES})...`
          );

          // Schedule a retry after delay
          setTimeout(() => {
            mutate();
          }, RETRY_DELAY);
        }

        // If we have cached data, use it instead of returning "0"
        if (cachedBalance !== "0") {
          console.log(
            "Using cached smart wallet USDC balance due to RPC error"
          );
          setIsUsingCache(true);
          return cachedBalance;
        }

        return "0";
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: cachedBalance || "0", // Use cached balance as fallback
      errorRetryCount: 3, // SWR's built-in retry count
    }
  );

  // Force refresh function that resets retry count
  const forceRefresh = () => {
    retryCountRef.current = 0;
    setIsRpcError(false);
    mutate();
  };

  return {
    balance: balance ?? cachedBalance ?? "0",
    error,
    isLoading: !error && !balance && cachedBalance === "0",
    isRpcError,
    isUsingCache,
    refresh: forceRefresh,
  };
}
