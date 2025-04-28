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
}

interface NFTResponse {
  nfts: NFT[];
  totalCount: number;
}

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

    // Fetch NFTs from our API route
    const response = await fetch(
      `/api/alchemy/nfts?address=${address}&chainId=${chainId}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch NFTs");
    }

    return (await response.json()) as NFTResponse;
  };

  const { data, error, isLoading, mutate } = useSWR(
    address ? `wallet-nfts-${address}-${chainId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 3600000, // Refresh every hour (NFTs don't change as frequently)
      dedupingInterval: 60000, // Dedupe calls within 1 minute
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
