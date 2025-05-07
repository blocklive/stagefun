import useSWR from "swr";
import { ZerionSDK, Asset } from "../lib/zerion/ZerionSDK";
import { useMemo } from "react";

// Initialize the Zerion SDK for browser use
// No API key needed in the browser - we'll use our proxy endpoints
const zerionSDK = new ZerionSDK("dummy-key");

/**
 * Custom hook to fetch wallet assets using the Zerion API via our backend proxy
 * @param address The wallet address to fetch assets for
 * @param chainId Optional chain ID to filter assets (default: "monad-test-v2")
 * @returns Object containing assets data, total value, loading state, error, and refresh function
 */
export function useWalletAssets(
  address: string | null,
  chainId: string = "monad-test-v2"
) {
  const fetcher = async (key: string) => {
    if (!address) return null;
    return await zerionSDK.getWalletAssets(address, chainId);
  };

  const { data, error, isLoading, mutate } = useSWR(
    address ? `wallet-assets-${address}-${chainId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      dedupingInterval: 10000, // Dedupe calls within 10 seconds
    }
  );

  // Filter out blank assets or those without proper information
  const filteredAssets = useMemo(() => {
    return (data?.data || []).filter((asset: Asset) => {
      // Check if the asset has fungible_info and quantity, but don't filter by quantity size
      return (
        asset.attributes &&
        asset.attributes.quantity &&
        asset.attributes.quantity.int !== "0" && // Use int instead of float to catch very small numbers
        asset.attributes.fungible_info &&
        asset.attributes.fungible_info.name &&
        asset.attributes.fungible_info.symbol
      );
    });
  }, [data]);

  // Calculate total value correctly - use actual values or quantity as dollar value if value is null
  const totalValue = useMemo(() => {
    return filteredAssets.reduce((sum: number, asset: Asset) => {
      const assetValue =
        asset.attributes.value !== null
          ? asset.attributes.value
          : asset.attributes.quantity.float;
      return sum + (assetValue || 0);
    }, 0);
  }, [filteredAssets]);

  // Use useMemo for the return value to ensure consistent object reference
  return useMemo(
    () => ({
      assets: filteredAssets,
      totalValue,
      isLoading,
      error,
      refresh: mutate,
    }),
    [filteredAssets, totalValue, isLoading, error, mutate]
  );
}
