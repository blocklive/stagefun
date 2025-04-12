import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { useWallets } from "@privy-io/react-auth";
import {
  getStageDotFunLiquidityContract,
  getPoolContract,
  fromUSDCBaseUnits,
  LP_TOKEN_MULTIPLIER,
} from "../lib/contracts/StageDotFunPool";

/**
 * Custom hook to fetch and monitor a user's LP token balance for a specific pool
 * @param lpTokenAddress The LP token contract address
 * @param poolAddress The pool contract address (optional, for getting LP balance directly from the pool)
 */
export function useLpBalance(
  lpTokenAddress: string | null | undefined,
  poolAddress?: string | null
) {
  const { smartWalletAddress } = useSmartWallet();
  const { wallets } = useWallets();

  // SWR fetcher function
  const fetcher = async ([address, wallet, poolAddr]: [
    string,
    string,
    string | undefined
  ]) => {
    if (!wallet) {
      return { balance: BigInt(0), formattedBalance: "0", displayBalance: "0" };
    }

    try {
      // Get provider from user's wallet
      const embeddedWallet = wallets.find(
        (w) => w.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        throw new Error("No embedded wallet found");
      }

      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);

      // Either get the balance from the pool contract directly or from the LP token contract
      try {
        let balance: bigint;

        if (poolAddr) {
          // Use pool contract's getLpBalance function (preferred method)
          const poolContract = getPoolContract(ethersProvider, poolAddr);
          balance = await poolContract.getLpBalance(wallet);
        } else if (address) {
          // Fallback to LP token contract
          const lpTokenContract = getStageDotFunLiquidityContract(
            ethersProvider,
            address
          );
          balance = await lpTokenContract.balanceOf(wallet);
        } else {
          return {
            balance: BigInt(0),
            formattedBalance: "0",
            displayBalance: "0",
          };
        }

        // Get the raw value (divided by 10^6 for 6 decimals)
        const rawValue = fromUSDCBaseUnits(balance);

        // Also provide the display value with the multiplier applied
        const displayValue = rawValue * LP_TOKEN_MULTIPLIER;

        console.log("LP token balance fetched successfully:", {
          lpTokenAddress: address,
          poolAddress: poolAddr,
          balance: balance.toString(),
          rawValue,
          displayValue,
        });

        return {
          balance,
          formattedBalance: rawValue.toString(),
          displayBalance: displayValue.toString(),
        };
      } catch (balanceError) {
        console.error("Error getting LP token balance:", balanceError);
        throw new Error(
          `Failed to get LP token balance: ${
            balanceError instanceof Error
              ? balanceError.message
              : "unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error in LP balance fetcher:", error);
      return { balance: BigInt(0), formattedBalance: "0", displayBalance: "0" };
    }
  };

  // Use SWR to handle data fetching
  const { data, error, isLoading, mutate } = useSWR(
    smartWalletAddress
      ? [lpTokenAddress, smartWalletAddress, poolAddress]
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      errorRetryCount: 3, // Retry 3 times on error
      dedupingInterval: 5000, // Don't call again within 5 seconds
      revalidateOnMount: true, // Always fetch when component mounts
      onError: (err) => {
        console.error("SWR error in useLpBalance:", err);
      },
    }
  );

  return {
    lpBalance: data?.balance || BigInt(0),
    formattedLpBalance: data?.formattedBalance || "0",
    displayLpBalance: data?.displayBalance || "0", // For UI display with multiplier
    isLoading,
    error,
    refreshLpBalance: () => mutate(),
  };
}
