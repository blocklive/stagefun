import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { useContractInteraction } from "../contexts/ContractInteractionContext";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useUSDCBalance() {
  const { user: privyUser, ready: privyReady } = usePrivy();
  const { getBalance } = useContractInteraction();
  const address = privyUser?.wallet?.address;

  // Add state to store the last successfully fetched balance
  const [cachedBalance, setCachedBalance] = useState<string>("0");
  const [isRpcError, setIsRpcError] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const retryCountRef = useRef(0);

  const {
    data: balance,
    error,
    mutate,
  } = useSWR(
    // Only fetch when we have an address and privy is ready
    address && privyReady ? ["usdc-balance", address] : null,
    async () => {
      try {
        setIsRpcError(false);
        setIsUsingCache(false);

        const balance = await getBalance(address!);

        // Store the successfully fetched balance in our cache
        setCachedBalance(balance);
        retryCountRef.current = 0; // Reset retry count on successful fetch

        return balance;
      } catch (error) {
        console.error("Error fetching USDC balance:", error);

        // Set RPC error state
        setIsRpcError(true);

        // Implement retry logic
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          console.log(
            `Retrying USDC balance fetch (${retryCountRef.current}/${MAX_RETRIES})...`
          );

          // Schedule a retry after delay
          setTimeout(() => {
            mutate();
          }, RETRY_DELAY);
        }

        // If we have cached data, use it instead of returning "0"
        if (cachedBalance !== "0") {
          console.log("Using cached USDC balance due to RPC error");
          setIsUsingCache(true);
          return cachedBalance;
        }

        return "0";
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds (increased from 12s to reduce load)
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
