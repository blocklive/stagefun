import { useUserHostedPools } from "./useUserHostedPools";
import { useSmartWalletBalance } from "./useSmartWalletBalance";
import { useMemo } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { useSmartWallet } from "./useSmartWallet";

interface Asset {
  name: string;
  symbol: string;
  balance: string;
  value: number;
  type: "token" | "pool" | "native";
  status?: string;
  isUsingCache?: boolean;
}

export function useUserAssets() {
  const { dbUser } = useSupabase();
  const { smartWalletAddress } = useSmartWallet();

  // Get USDC balance from smart wallet
  const {
    balance: smartWalletUsdcBalance,
    isLoading: isLoadingSmartWalletUsdc,
    isUsingCache: isUsingCachedSmartWalletBalance,
    refresh: refreshSmartWalletUsdcBalance,
  } = useSmartWalletBalance();

  // Pass the user ID directly - the hook will handle filtering internally
  const { pools: userPools, isLoading: isLoadingPools } = useUserHostedPools(
    dbUser?.id
  );

  const assets = useMemo(() => {
    const result: Asset[] = [];

    // Add USDC from smart wallet (if available)
    if (
      smartWalletAddress &&
      smartWalletUsdcBalance &&
      parseFloat(smartWalletUsdcBalance) > 0
    ) {
      result.push({
        name: "USDC",
        symbol: "USDC",
        balance: smartWalletUsdcBalance,
        value: parseFloat(smartWalletUsdcBalance), // USDC is pegged to USD
        type: "token",
        isUsingCache: isUsingCachedSmartWalletBalance,
      });
    }

    // Note: LP tokens from user pools are not shown yet
    // Will be implemented properly in the future

    return result;
  }, [
    smartWalletUsdcBalance,
    smartWalletAddress,
    isUsingCachedSmartWalletBalance,
  ]);

  const totalBalance = useMemo(() => {
    return assets.reduce((total, asset) => total + asset.value, 0).toFixed(2);
  }, [assets]);

  return {
    assets,
    totalBalance,
    isLoading: isLoadingSmartWalletUsdc || isLoadingPools,
    isUsingCachedSmartWalletBalance,
    refreshUsdcBalance: refreshSmartWalletUsdcBalance,
  };
}
