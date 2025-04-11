import { useState, useCallback } from "react";
import { useSmartWallet } from "./useSmartWallet";
import { ethers } from "ethers";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";
import showToast from "../utils/toast";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { standardizeSmartWalletError } from "../lib/utils/smartWalletUtils";

/**
 * Custom hook for claiming refunds from failed pools
 */
export function useClaimRefund() {
  const [isRefunding, setIsRefunding] = useState(false);
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
   * Claims a refund from a failed pool
   * @param poolAddress The contract address of the pool
   * @param onSuccess Callback function to be called on successful refund
   */
  const handleClaimRefund = useCallback(
    async (poolAddress: string, onSuccess?: () => void): Promise<void> => {
      if (!poolAddress) {
        showToast.error("Pool address is required");
        return;
      }

      if (!user) {
        showToast.error("You must be logged in to claim a refund");
        return;
      }

      // Create a toast for loading status
      const loadingToast = showToast.loading(
        "Processing your refund request..."
      );

      setIsRefunding(true);
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

        // If pool is not in FAILED status, try to update it
        if (Number(poolDetails._status) !== 6) {
          try {
            showToast.loading("Updating pool status...", { id: loadingToast });
            console.log("Calling checkPoolStatus to update pool state...");

            // Call checkPoolStatus to update the pool's status
            const updateResult = await callContractFunction(
              poolAddress as `0x${string}`,
              StageDotFunPoolABI,
              "checkPoolStatus",
              [],
              "Update pool status"
            );

            if (updateResult.success) {
              showToast.loading(
                "Pool status updated, checking eligibility again...",
                { id: loadingToast }
              );

              // Wait for transaction confirmation with at least 2 confirmations for greater reliability
              showToast.loading("Waiting for blockchain confirmations...", {
                id: loadingToast,
              });

              try {
                await provider.waitForTransaction(
                  updateResult.txHash as string,
                  2
                ); // Wait for at least 2 confirmations

                // Add a small delay to ensure blockchain state is fully updated
                await new Promise((resolve) => setTimeout(resolve, 3000));

                // Fetch updated pool details
                const updatedPoolDetails = await poolContract.getPoolDetails();
                console.log("Updated pool status:", updatedPoolDetails._status);

                // Update our local copy of the pool details
                poolDetails._status = updatedPoolDetails._status;
              } catch (confirmationError) {
                console.error(
                  "Error waiting for confirmations:",
                  confirmationError
                );
                throw new Error(
                  "Transaction was submitted but we couldn't verify it was confirmed. Please try again in a moment."
                );
              }
            } else {
              throw new Error(
                "Failed to update pool status: " +
                  (updateResult.error || "Unknown error")
              );
            }
          } catch (statusUpdateError) {
            console.error("Error updating pool status:", statusUpdateError);
            throw new Error(
              "Failed to update pool status. Please try again later."
            );
          }
        }

        // Check if pool is eligible for refunds (status FAILED - 6)
        if (Number(poolDetails._status) !== 6) {
          throw new Error(
            "This pool is not eligible for refunds. Only failed pools allow refunds."
          );
        }

        // Check LP token balance to see if user has tokens to refund
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
          throw new Error("You don't have any tokens to refund from this pool");
        }

        // Now make the actual contract call using smart wallet
        showToast.loading("Submitting refund request...", { id: loadingToast });
        console.log("Calling claimRefund with smart wallet...");

        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "claimRefund",
          [],
          "Claim refund from pool"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to process refund");
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
          showToast.success("Your refund has been processed successfully!", {
            id: loadingToast,
          });

          if (onSuccess) {
            onSuccess();
          }
        } else {
          throw new Error("Transaction failed on chain");
        }
      } catch (error) {
        console.error("Error claiming refund:", error);

        // Use the standardized error message utility
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        // If it's a smart wallet error (different from original), handle accordingly
        if (standardizedError !== errorMessage) {
          showToast.error(standardizedError, { id: loadingToast });
        } else {
          showToast.error(`Refund failed: ${errorMessage}`, {
            id: loadingToast,
          });
        }
      } finally {
        setIsRefunding(false);
      }
    },
    [user, smartWalletAddress, callContractFunction, getProvider]
  );

  return {
    isRefunding,
    handleClaimRefund,
  };
}
