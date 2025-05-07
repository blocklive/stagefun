import { useState, useEffect, useCallback, useMemo } from "react";
import { useWalletAssetsAlchemy } from "./useWalletAssetsAlchemy";
import { alchemyTokensToZerionAssets } from "@/lib/alchemy/transformers";
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
 * Adapter hook that uses Alchemy API for wallet assets
 * @param address Wallet address
 * @param chainId Chain ID (default: "monad-test-v2")
 * @param options Configuration options (ignored, kept for backward compatibility)
 * @returns Wallet assets in Zerion-compatible format
 */
export function useWalletAssetsAdapter(
  address: string | null,
  chainId: string = "monad-test-v2",
  options: UseWalletAssetsAdapterOptions = {}
): UseWalletAssetsAdapterResult {
  // Get Alchemy data
  const {
    tokens,
    totalValue: alchemyTotalValue,
    isLoading,
    error: alchemyError,
    refresh,
  } = useWalletAssetsAlchemy(address, chainId);

  // Convert Alchemy tokens to Zerion format
  const assets = useMemo(() => {
    if (tokens.length === 0) return [];
    return alchemyTokensToZerionAssets(tokens);
  }, [tokens]);

  // Format error to string
  const error = useMemo(() => {
    if (!alchemyError) return null;
    return typeof alchemyError === "string"
      ? alchemyError
      : String(alchemyError);
  }, [alchemyError]);

  // Return the results directly - no intermediate state
  return {
    assets,
    totalValue: alchemyTotalValue,
    isLoading,
    error,
    refresh,
    source: "alchemy", // We only use Alchemy now
  };
}
