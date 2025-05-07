import useSWR from "swr";

export interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string | null;
  contractAddress: string;
  collectionName: string;
  contractSymbol: string;
  tokenType: string;
  timeLastUpdated: string;
  metadata: any;
  acquiredAt?: {
    blockTimestamp: string;
    blockNumber: string;
  };
}

interface NFTResponse {
  nfts: NFT[];
  totalCount: number;
}

// Constants for retry mechanism
const MAX_RETRIES = 5;

/**
 * Custom hook to fetch NFTs owned by a wallet address
 * @param address The wallet address to fetch NFTs for
 * @param chainId Optional chain ID to filter NFTs (default: "monad-test-v2")
 * @returns Object containing NFTs data, loading state, error, and refresh function
 */
export function useWalletNFTs(
  address: string | null,
  chainId: string = "monad-test-v2"
) {
  const fetcher = async (key: string) => {
    if (!address) return null;

    try {
      // Fetch NFTs from our API route
      const response = await fetch(
        `/api/alchemy/nfts?address=${address}&chainId=${chainId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch NFTs");
      }

      return (await response.json()) as NFTResponse;
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
          `Alchemy NFT API rate limited: ${errorMessage}. Will retry automatically.`
        );
      }

      // Rethrow to let SWR handle retries with its built-in exponential backoff
      throw error;
    }
  };

  const { data, error, isLoading, mutate } = useSWR(
    address ? `wallet-nfts-${address}-${chainId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 3600000, // Refresh every hour (NFTs don't change as frequently)
      dedupingInterval: 60000, // Dedupe calls within 1 minute
      errorRetryCount: MAX_RETRIES, // Max number of retries
      // Let SWR handle the retry timing with its built-in exponential backoff
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
            `Retrying Alchemy NFT API call (${retryCount}/${MAX_RETRIES})...`
          );
        } else {
          console.error("Non-retryable Alchemy NFT API error:", error);
          return false; // Don't retry
        }
      },
    }
  );

  return {
    nfts: data?.nfts || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
