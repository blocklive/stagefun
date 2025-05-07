import { useState, useEffect, useCallback, useMemo } from "react";
import { useWalletAssets } from "./useWalletAssets";
import { useWalletAssetsAlchemy } from "./useWalletAssetsAlchemy";
import {
  alchemyTokensToZerionAssets,
  combineAssets,
} from "@/lib/alchemy/transformers";
import { Asset } from "@/lib/zerion/ZerionSDK";

interface UseWalletAssetsAdapterResult {
  assets: Asset[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  source: "alchemy" | "zerion" | "combined";
}

interface UseWalletAssetsAdapterOptions {
  useZerion?: boolean;
  combineData?: boolean;
}

/**
 * Adapter hook that primarily uses Alchemy API, with Zerion as an optional fallback
 * @param address Wallet address
 * @param chainId Chain ID (default: "monad-test-v2")
 * @param options Configuration options
 * @returns Wallet assets in Zerion-compatible format
 */
export function useWalletAssetsAdapter(
  address: string | null,
  chainId: string = "monad-test-v2",
  options: UseWalletAssetsAdapterOptions = {}
): UseWalletAssetsAdapterResult {
  // Default options
  const { useZerion = false, combineData = false } = options;

  // Get Alchemy data - we always do this
  const alchemy = useWalletAssetsAlchemy(address, chainId);

  // Only fetch Zerion data if explicitly requested
  const zerion = useZerion ? useWalletAssets(address, chainId) : null;

  // State for combined results
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"alchemy" | "zerion" | "combined">(
    "alchemy"
  );

  // Memoize data that might change often to prevent dependency cycles
  const alchemyData = useMemo(
    () => ({
      tokens: alchemy.tokens,
      totalValue: alchemy.totalValue,
      isLoading: alchemy.isLoading,
      error: alchemy.error,
    }),
    [alchemy.tokens, alchemy.totalValue, alchemy.isLoading, alchemy.error]
  );

  const zerionData = useMemo(
    () =>
      zerion
        ? {
            assets: zerion.assets,
            totalValue: zerion.totalValue,
            isLoading: zerion.isLoading,
            error: zerion.error,
          }
        : null,
    [zerion]
  );

  // Update the data when sources change
  useEffect(() => {
    // Set loading state if Alchemy is still loading
    if (alchemyData.isLoading) {
      setIsLoading(true);
      return;
    }

    // Primary path: Use Alchemy data
    if (alchemyData.tokens.length > 0) {
      // Convert Alchemy tokens to Zerion format for consistency
      const alchemyAssets = alchemyTokensToZerionAssets(alchemyData.tokens);

      // Handle combining data if Zerion is enabled and data is available
      if (combineData && zerionData && zerionData.assets.length > 0) {
        const combinedAssets = combineAssets(alchemyAssets, zerionData.assets);
        setAssets(combinedAssets);
        setTotalValue(
          alchemyData.totalValue || (zerionData ? zerionData.totalValue : 0)
        );
        setSource("combined");
      } else {
        // Just use Alchemy data (default path)
        setAssets(alchemyAssets);
        setTotalValue(alchemyData.totalValue);
        setSource("alchemy");
      }
      setError(alchemyData.error);
    }
    // Fallback to Zerion only if explicitly requested and Alchemy failed
    else if (useZerion && zerionData && zerionData.assets.length > 0) {
      setAssets(zerionData.assets);
      setTotalValue(zerionData.totalValue);
      setError(zerionData.error);
      setSource("zerion");
    }
    // No data from any source
    else {
      setAssets([]);
      setTotalValue(0);
      setError(alchemyData.error);
      setSource("alchemy"); // Still indicate Alchemy since that's our primary source
    }

    setIsLoading(false);
  }, [alchemyData, zerionData, useZerion, combineData]);

  // Refresh function - always refresh Alchemy, only refresh Zerion if enabled
  const refresh = useCallback(() => {
    alchemy.refresh();
    if (zerion) {
      zerion.refresh();
    }
  }, [alchemy.refresh, zerion]);

  return useMemo(
    () => ({
      assets,
      totalValue,
      isLoading,
      error,
      refresh,
      source,
    }),
    [assets, totalValue, isLoading, error, refresh, source]
  );
}
