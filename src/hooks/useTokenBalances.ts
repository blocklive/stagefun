import { useState, useCallback } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { getERC20Contract } from "../lib/contracts/StageSwap";
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";

// Official WMON token address
const OFFICIAL_WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

interface TokenBalances {
  mon: string; // Native MON balance
  wmon: string; // Wrapped MON balance
  usdc: string;
}

export function useTokenBalances() {
  const { smartWalletAddress } = useSmartWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch balances: native MON, WMON, and USDC
  const fetchBalances = async (address: string): Promise<TokenBalances> => {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      // Get USDC balance
      const usdcContract = await getERC20Contract(
        CONTRACT_ADDRESSES.monadTestnet.usdc,
        provider
      );
      const usdcBalance = await usdcContract.balanceOf(address);

      // Get native MON balance
      const monBalance = await provider.getBalance(address);

      // Get official WMON balance
      const wmonContract = await getERC20Contract(
        OFFICIAL_WMON_ADDRESS,
        provider
      );
      const wmonBalance = await wmonContract.balanceOf(address);

      return {
        usdc: ethers.formatUnits(usdcBalance, 6), // USDC has 6 decimals
        mon: ethers.formatUnits(monBalance, 18), // MON has 18 decimals
        wmon: ethers.formatUnits(wmonBalance, 18), // WMON has 18 decimals
      };
    } catch (error) {
      console.error("Error fetching token balances:", error);
      return { usdc: "0", mon: "0", wmon: "0" };
    }
  };

  // Use SWR with its built-in caching
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    smartWalletAddress ? `token-balances-${smartWalletAddress}` : null,
    async () => {
      if (!smartWalletAddress) return { usdc: "0", mon: "0", wmon: "0" };
      return fetchBalances(smartWalletAddress);
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
      console.error("Error refreshing balances:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [smartWalletAddress, mutate, isRefreshing]);

  return {
    balances: data || { usdc: "0", mon: "0", wmon: "0" },
    isLoading: isLoading,
    isRefreshing: isValidating || isRefreshing,
    error,
    refresh,
  };
}
