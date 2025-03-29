import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { getUSDCContract } from "../lib/contracts/StageDotFunPool";

export function useSmartWalletBalance() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simple balance fetcher function
  const fetchBalance = async (address: string) => {
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );
    const usdcContract = getUSDCContract(provider);
    const balanceWei = await usdcContract.balanceOf(address);
    return ethers.formatUnits(balanceWei, 6);
  };

  // Use SWR with its built-in caching
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    smartWalletAddress ? `usdc-balance-${smartWalletAddress}` : null,
    async () => {
      if (!smartWalletAddress) return "0";
      return fetchBalance(smartWalletAddress);
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe calls within 5 seconds
      errorRetryCount: 2, // Retry 2 times on error
      errorRetryInterval: 5000, // Wait 5s between retries
    }
  );

  // Simple refresh function
  const refresh = useCallback(async () => {
    if (!smartWalletAddress || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await mutate();
    } catch (error) {
      console.error("Error refreshing balance:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [smartWalletAddress, mutate, isRefreshing]);

  return {
    balance: data || "0",
    isLoading: isLoading,
    isRefreshing: isValidating || isRefreshing,
    error,
    refresh,
  };
}
