import { useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  AlchemySDK,
  WalletTokensResponse,
  TokenWithBalance,
} from "@/lib/alchemy/AlchemySDK";

// Initialize the AlchemySDK with API key
// The API key is not exposed here since we'll use the proxy endpoints
const alchemySDK = new AlchemySDK(
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"
);

// Constants for retry mechanism
const MAX_RETRIES = 5;

interface UseWalletAssetsAlchemyResult {
  tokens: TokenWithBalance[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch wallet assets using Alchemy Portfolio API
 * @param address Wallet address
 * @param chainId Chain ID (default: "monad-test-v2")
 * @returns Wallet assets data and loading state
 */
export function useWalletAssetsAlchemy(
  address: string | null,
  chainId: string = "monad-test-v2"
): UseWalletAssetsAlchemyResult {
  // Fetcher function for SWR
  const fetcher = useCallback(async () => {
    if (!address) return { tokens: [], totalValue: 0 };

    try {
      // Get tokens using the Portfolio API (single call)
      const result: WalletTokensResponse = await alchemySDK.getWalletTokens(
        address,
        chainId
      );
      return {
        tokens: result.tokens || [],
        totalValue: result.totalValue || 0,
      };
    } catch (error) {
      // Log rate limit errors for debugging
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.includes("too many requests")
      ) {
        console.warn(
          `Alchemy API rate limited: ${errorMessage}. Will retry automatically.`
        );
      }

      // Rethrow to let SWR handle retries with its built-in exponential backoff
      throw error;
    }
  }, [address, chainId]);

  // Use SWR to fetch and cache data with default retry behavior
  const { data, error, isLoading, mutate } = useSWR(
    address ? `alchemy-tokens-${address}-${chainId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      dedupingInterval: 10000, // Dedupe calls within 10 seconds
      errorRetryCount: MAX_RETRIES, // Max number of retries
      // Let SWR handle the exponential backoff retry timing
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Only retry for network errors and rate limits, not for other errors
        const errorMessage = error?.message || String(error);
        const shouldRetry =
          errorMessage.includes("rate limit") ||
          errorMessage.includes("429") ||
          errorMessage.includes("too many requests") ||
          errorMessage.includes("network") ||
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout");

        // Log the retry attempt
        if (shouldRetry) {
          console.log(
            `Retrying Alchemy API call (${retryCount}/${MAX_RETRIES})...`
          );
        } else {
          console.error("Non-retryable Alchemy API error:", error);
          return false; // Don't retry
        }
      },
    }
  );

  // Extract tokens and totalValue from the data
  const tokens = useMemo(() => {
    const tokensList = data?.tokens || [];
    console.log(
      `useWalletAssetsAlchemy hook received ${tokensList.length} tokens from API`
    );
    return tokensList;
  }, [data?.tokens]);
  const totalValue = useMemo(() => data?.totalValue || 0, [data?.totalValue]);

  // Function to refresh the data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Use useMemo for the return value to ensure consistent object reference
  return useMemo(
    () => ({
      tokens,
      totalValue,
      isLoading,
      error: error
        ? error instanceof Error
          ? error.message
          : String(error)
        : null,
      refresh,
    }),
    [tokens, totalValue, isLoading, error, refresh]
  );
}
