import { useState, useEffect, useCallback, useMemo } from "react";
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

interface UseWalletAssetsAlchemyResult {
  tokens: TokenWithBalance[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch wallet assets using Alchemy API
 * @param address Wallet address
 * @param chainId Chain ID (default: "monad-test-v2")
 * @returns Wallet assets data and loading state
 */
export function useWalletAssetsAlchemy(
  address: string | null,
  chainId: string = "monad-test-v2"
): UseWalletAssetsAlchemyResult {
  const [tokensData, setTokensData] = useState<TokenWithBalance[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // Memoize tokens to ensure we don't create a new array reference on every render
  const tokens = useMemo(() => tokensData, [tokensData]);

  // Function to refresh the data
  const refresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAssets = async () => {
      if (!address) {
        setTokensData([]);
        setTotalValue(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result: WalletTokensResponse = await alchemySDK.getWalletTokens(
          address,
          chainId
        );

        if (isMounted) {
          setTokensData(result.tokens || []);
          setTotalValue(result.totalValue || 0);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching wallet tokens:", error);
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to fetch wallet tokens"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAssets();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [address, chainId, refreshCounter]);

  // Use useMemo for the return value to ensure consistent object reference
  return useMemo(
    () => ({
      tokens,
      totalValue,
      isLoading,
      error,
      refresh,
    }),
    [tokens, totalValue, isLoading, error, refresh]
  );
}
