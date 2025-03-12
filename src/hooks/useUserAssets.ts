import { useUSDCBalance } from "./useUSDCBalance";
import { useNativeBalance } from "./useNativeBalance";
import { useUserCreatedPools } from "./useUserCreatedPools";
import { useMemo } from "react";
import { useSupabase } from "../contexts/SupabaseContext";

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
  const {
    balance: usdcBalance,
    isLoading: isLoadingUsdc,
    isUsingCache: isUsingCachedBalance,
    refresh: refreshUsdcBalance,
  } = useUSDCBalance();
  const { balance: monBalance, isLoading: isLoadingMon } = useNativeBalance();
  const { pools: userPools, isLoading: isLoadingPools } = useUserCreatedPools(
    dbUser?.id || ""
  );

  const assets = useMemo(() => {
    const result: Asset[] = [];

    // Add MON (native token)
    if (monBalance && parseFloat(monBalance) > 0) {
      result.push({
        name: "Monad",
        symbol: "MON",
        balance: monBalance,
        value: parseFloat(monBalance), // 1 MON = 1 USDC
        type: "native",
      });
    }

    // Add USDC
    if (usdcBalance && parseFloat(usdcBalance) > 0) {
      result.push({
        name: "Testnet USDC",
        symbol: "USDC",
        balance: usdcBalance,
        value: parseFloat(usdcBalance), // USDC is pegged to USD
        type: "token",
        isUsingCache: isUsingCachedBalance,
      });
    }

    // Note: LP tokens from user pools are not shown yet
    // Will be implemented properly in the future

    return result;
  }, [usdcBalance, monBalance, isUsingCachedBalance]);

  const totalBalance = useMemo(() => {
    return assets.reduce((total, asset) => total + asset.value, 0).toFixed(2);
  }, [assets]);

  return {
    assets,
    totalBalance,
    isLoading: isLoadingUsdc || isLoadingMon || isLoadingPools,
    isUsingCachedBalance,
    refreshUsdcBalance,
  };
}
