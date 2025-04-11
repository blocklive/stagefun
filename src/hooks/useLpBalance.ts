import useSWR from "swr";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { useWallets } from "@privy-io/react-auth";
import { getStageDotFunLiquidityContract } from "../lib/contracts/StageDotFunPool";
import { fromUSDCBaseUnits } from "../lib/contracts/StageDotFunPool";

/**
 * Custom hook to fetch and monitor a user's LP token balance for a specific pool
 * @param lpTokenAddress The LP token contract address
 */
export function useLpBalance(lpTokenAddress: string | null | undefined) {
  const { smartWalletAddress } = useSmartWallet();
  const { wallets } = useWallets();

  // SWR fetcher function
  const fetcher = async ([address, wallet]: [string, string]) => {
    if (!address || !wallet) {
      return { balance: BigInt(0), formattedBalance: "0" };
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

      // Get LP token contract using the address directly
      const lpTokenContract = getStageDotFunLiquidityContract(
        ethersProvider,
        address
      );

      // Get balance
      try {
        const balance = await lpTokenContract.balanceOf(wallet);
        const formattedBalance = fromUSDCBaseUnits(balance);

        console.log("LP token balance fetched successfully:", {
          lpTokenAddress: address,
          balance: balance.toString(),
          formattedBalance,
        });

        return {
          balance,
          formattedBalance: formattedBalance.toString(),
        };
      } catch (balanceError) {
        console.error(
          "Error calling balanceOf on LP token contract:",
          balanceError
        );
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
      return { balance: BigInt(0), formattedBalance: "0" };
    }
  };

  // Use SWR to handle data fetching
  const { data, error, isLoading, mutate } = useSWR(
    lpTokenAddress && smartWalletAddress
      ? [lpTokenAddress, smartWalletAddress]
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
    isLoading,
    error,
    refreshLpBalance: () => mutate(),
  };
}
