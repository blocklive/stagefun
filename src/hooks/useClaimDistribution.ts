import { useState, useCallback } from "react";
import { useSmartWallet } from "./useSmartWallet";
import { ethers } from "ethers";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";
import showToast from "../utils/toast";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { standardizeSmartWalletError } from "../lib/utils/smartWalletUtils";

/**
 * Custom hook for claiming revenue distributions from pools
 */
export function useClaimDistribution() {
  const [isClaiming, setIsClaiming] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<bigint | null>(null);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const { user, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();

  // Get provider from user's wallet (for read operations)
  const getProvider = useCallback(async () => {
    if (!user) {
      throw new Error("User is not authenticated. Please log in.");
    }

    // If user doesn't have a wallet, prompt to create one
    if (!wallets || wallets.length === 0) {
      throw new Error(
        "No wallet found. Please create a wallet before proceeding."
      );
    }

    const embeddedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );

    if (!embeddedWallet) {
      throw new Error("No embedded wallet found. Please create one.");
    }

    // Get provider from embedded wallet
    const provider = await embeddedWallet.getEthereumProvider();
    return new ethers.BrowserProvider(provider);
  }, [user, wallets]);

  /**
   * Fetches the pending rewards for the current user
   */
  const fetchPendingRewards = useCallback(
    async (poolAddress: string): Promise<bigint> => {
      if (!smartWalletAddress) {
        return BigInt(0);
      }

      try {
        const provider = await getProvider();
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          provider
        );

        const rewards = await poolContract.pendingRewards(smartWalletAddress);
        setPendingAmount(rewards);
        return rewards;
      } catch (error) {
        console.error("Error fetching pending rewards:", error);
        return BigInt(0);
      }
    },
    [smartWalletAddress, getProvider]
  );

  /**
   * Claims revenue distribution from a pool
   * @param poolAddress The contract address of the pool
   * @param onSuccess Callback function to be called on successful claim
   */
  const handleClaimDistribution = useCallback(
    async (poolAddress: string, onSuccess?: () => void): Promise<void> => {
      if (!poolAddress) {
        showToast.error("Pool address is required");
        return;
      }

      if (!user) {
        showToast.error("You must be logged in to claim distributions");
        return;
      }

      // Create a toast for loading status
      const loadingToast = showToast.loading(
        "Processing your distribution claim..."
      );

      setIsClaiming(true);
      try {
        // Check if smart wallet is available
        if (!smartWalletAddress || !callContractFunction) {
          throw new Error("Smart wallet not available. Please log in again.");
        }

        // First, get a provider to check eligibility and pool details
        const provider = await getProvider();

        // Create a read-only contract instance to check pool status
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          provider
        );

        // Get pool details to check status
        showToast.loading("Checking pool status...", { id: loadingToast });
        const poolDetails = await poolContract.getPoolDetails();
        console.log("Pool status:", poolDetails._status);

        // Check if pool is in EXECUTING status (7)
        if (Number(poolDetails._status) !== 7) {
          throw new Error(
            "This pool is not in execution phase. Only executing pools allow claiming distributions."
          );
        }

        // Check if there's revenue accumulated
        if (poolDetails._revenueAccumulated <= BigInt(0)) {
          throw new Error("This pool has no revenue to claim.");
        }

        // Check LP token balance to see if user has tokens
        showToast.loading("Checking your pool tokens...", { id: loadingToast });

        // Get LP token contract to check balance
        const lpTokenContract = new ethers.Contract(
          poolDetails._lpTokenAddress,
          ["function balanceOf(address owner) view returns (uint256)"],
          provider
        );

        // Check LP token balance for the smart wallet
        const lpBalance = await lpTokenContract.balanceOf(smartWalletAddress);
        console.log("LP token balance:", lpBalance.toString());

        if (lpBalance <= BigInt(0)) {
          throw new Error("You don't have any LP tokens in this pool");
        }

        // Check pending rewards
        showToast.loading("Checking your pending rewards...", {
          id: loadingToast,
        });
        const pendingRewards = await poolContract.pendingRewards(
          smartWalletAddress
        );
        console.log("Pending rewards:", pendingRewards.toString());

        if (pendingRewards <= BigInt(0)) {
          throw new Error("You don't have any pending rewards to claim");
        }

        // Now make the actual contract call using smart wallet
        showToast.loading("Submitting claim request...", { id: loadingToast });
        console.log("Calling claimDistribution with smart wallet...");

        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "claimDistribution",
          [],
          "Claim revenue distribution"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to process claim");
        }

        // Wait for transaction confirmation
        showToast.loading("Waiting for blockchain confirmation...", {
          id: loadingToast,
        });

        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        // Verify transaction was successful
        if (receipt && receipt.status === 1) {
          // Reset pending amount after successful claim
          setPendingAmount(null);

          if (onSuccess) {
            onSuccess();
          }
        } else {
          throw new Error("Transaction failed on chain");
        }
      } catch (error) {
        console.error("Error claiming distribution:", error);

        // Use the standardized error message utility
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        // If it's a smart wallet error (different from original), handle accordingly
        if (standardizedError !== errorMessage) {
          showToast.error(standardizedError, { id: loadingToast });
        } else {
          showToast.error(`Claim failed: ${errorMessage}`, {
            id: loadingToast,
          });
        }
      } finally {
        setIsClaiming(false);
      }
    },
    [user, smartWalletAddress, callContractFunction, getProvider]
  );

  return {
    isClaiming,
    pendingAmount,
    fetchPendingRewards,
    handleClaimDistribution,
  };
}
