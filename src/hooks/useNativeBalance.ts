import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { useContractInteraction } from "../contexts/ContractInteractionContext";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useNativeBalance() {
  const { user: privyUser, ready: privyReady } = usePrivy();
  const { getNativeBalance } = useContractInteraction();
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
    address && privyReady ? ["native-balance", address] : null,
    async (): Promise<string> => {
      try {
        // Reset RPC error state when attempting a new fetch
        setIsRpcError(false);
        setIsUsingCache(false);

        const balance = await getNativeBalance(address!);

        // Update cache on successful fetch
        setCachedBalance(balance);
        retryCountRef.current = 0;

        return balance;
      } catch (error) {
        console.error("Error fetching native MON balance:", error);

        // If we have a cached balance, use it
        if (cachedBalance !== "0") {
          setIsUsingCache(true);
          return cachedBalance;
        }

        // Handle RPC errors with retry mechanism
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          setIsRpcError(true);
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          const result = await mutate();
          return result ?? "0";
        }

        return "0";
      }
    },
    {
      revalidateOnFocus: true, // Revalidate when window regains focus
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      fallbackData: "0", // Default value while loading
    }
  );

  return {
    balance: balance ?? "0",
    error,
    isLoading: !error && !balance,
    refresh: () => mutate(),
    isRpcError,
    isUsingCache,
  };
}
