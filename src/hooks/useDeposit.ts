import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  DepositService,
  DepositResult,
} from "../lib/services/blockchain/deposit.service";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";
import { useSmartWallet } from "./useSmartWallet";
import { useSmartWalletBalance } from "./useSmartWalletBalance";
import { getUSDCContract } from "../lib/contracts/StageDotFunPool";

export interface UseDepositResult {
  isLoading: boolean;
  error: string | null;
  depositToPool: (
    poolAddress: string,
    amount: number,
    tierId: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function useDeposit(): UseDepositResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    smartWalletAddress,
    callContractFunction,
    isLoading: smartWalletIsLoading,
  } = useSmartWallet();
  const { balance: smartWalletBalance, refresh: refreshSmartWalletBalance } =
    useSmartWalletBalance();

  // Get provider from user's wallet
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

  const depositToPool = useCallback(
    async (
      poolAddress: string,
      amount: number,
      tierId: number
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      // Check if amount is valid
      if (amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" };
      }

      // Clear any previous errors
      setError(null);
      setIsLoading(true);

      // Create a toast for loading status
      const loadingToast = toast.loading("Processing your deposit...");

      try {
        // Get provider from user's wallet
        const provider = await getProvider();

        // Create deposit service
        const depositService = new DepositService(provider);

        // Get pool details to fetch tier price
        const tierDetails = await depositService.getTierDetails(
          poolAddress,
          tierId
        );
        console.log("Tier details:", tierDetails);

        if (!tierDetails.success || !tierDetails.tier) {
          throw new Error(tierDetails.error || "Failed to get tier details");
        }

        const tier = tierDetails.tier;

        // Check deposit requirements
        const { requirements, error: requirementsError } =
          await depositService.checkDepositRequirements(
            poolAddress,
            tierId,
            tier.price
          );

        console.log("Deposit requirements:", {
          requirements,
          tierPrice: tier.price.toString(),
        });

        if (requirementsError) {
          throw new Error(requirementsError);
        }

        // Check if all requirements are met
        const unmetRequirements = Object.entries(requirements)
          .filter(([_, value]) => !value)
          .map(([key]) => key);

        if (unmetRequirements.length > 0) {
          throw new Error(
            `Deposit requirements not met: ${unmetRequirements.join(", ")}`
          );
        }

        // Check USDC allowance
        const commitAmount = ethers.parseUnits(amount.toString(), 6);
        console.log("Commit amount calculation:", {
          inputAmount: amount,
          commitAmount: commitAmount.toString(),
          tierPrice: tier.price.toString(),
        });

        // Check if we have a smart wallet to use
        if (smartWalletAddress && callContractFunction) {
          console.log("Using smart wallet for deposit:", smartWalletAddress);
          toast.loading("Using smart wallet with gas sponsorship...", {
            id: loadingToast,
          });

          // CRITICAL: Check if user has enough USDC balance in their smart wallet
          // Refresh balance first to get the latest
          await refreshSmartWalletBalance();
          const userBalanceInWei = ethers.parseUnits(
            smartWalletBalance || "0",
            6
          );

          if (userBalanceInWei < commitAmount) {
            const errorMessage = `Insufficient USDC balance. You have ${smartWalletBalance} USDC but need ${ethers.formatUnits(
              commitAmount,
              6
            )} USDC.`;
            console.error(errorMessage);
            toast.error(errorMessage, { id: loadingToast });
            return { success: false, error: errorMessage };
          }

          // Use smart wallet address for allowance check
          const { hasEnoughAllowance, currentAllowance } =
            await depositService.checkUSDCAllowance(
              smartWalletAddress,
              poolAddress,
              commitAmount
            );

          console.log("USDC allowance check (smart wallet):", {
            hasEnoughAllowance,
            currentAllowance: currentAllowance.toString(),
            requiredAmount: commitAmount.toString(),
          });

          // Approve USDC if needed
          if (!hasEnoughAllowance) {
            toast.loading("Approving USDC...", { id: loadingToast });
            console.log("Approving USDC with smart wallet:", {
              poolAddress,
              commitAmount: commitAmount.toString(),
            });

            const approvalResult =
              await depositService.approveUSDCWithSmartWallet(
                callContractFunction,
                poolAddress,
                commitAmount
              );

            if (!approvalResult.success) {
              throw new Error(approvalResult.error || "Failed to approve USDC");
            }

            console.log("USDC approval result:", approvalResult);
            // Wait for approval transaction to be mined
            await provider.waitForTransaction(approvalResult.txHash as string);

            // Double-check that the approval was successful
            const newAllowanceCheck = await depositService.checkUSDCAllowance(
              smartWalletAddress,
              poolAddress,
              commitAmount
            );

            if (!newAllowanceCheck.hasEnoughAllowance) {
              throw new Error(
                "USDC approval didn't increase allowance as expected"
              );
            }
          }

          // Commit to tier
          toast.loading("Initiating deposit transaction...", {
            id: loadingToast,
          });
          console.log("Committing to tier with smart wallet:", {
            poolAddress,
            tierId,
            commitAmount: commitAmount.toString(),
          });

          const commitResult = await depositService.commitToTierWithSmartWallet(
            callContractFunction,
            poolAddress,
            tierId,
            commitAmount
          );

          console.log("Commit result:", commitResult);

          if (!commitResult.success) {
            throw new Error(commitResult.error || "Failed to commit to tier");
          }

          // Wait for transaction confirmation
          toast.loading("Waiting for transaction confirmation...", {
            id: loadingToast,
          });
          const receipt = await provider.waitForTransaction(
            commitResult.txHash as string
          );

          // Verify transaction was successful
          if (!receipt || receipt.status === 0) {
            throw new Error("Transaction failed on-chain");
          }

          // Verify balance changes
          toast.loading("Verifying deposit...", { id: loadingToast });

          // Wait a bit for blockchain state to update
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Verify by checking pool's state
          try {
            // Check if user's tier commitment was recorded
            const userTiersResult = await depositService.getUserTierCommitments(
              poolAddress,
              smartWalletAddress
            );

            // Only consider it successful if we got a result with commitments
            if (
              userTiersResult.success &&
              userTiersResult.commitments &&
              userTiersResult.commitments.length > 0
            ) {
              console.log(
                "User tier commitments after transaction:",
                userTiersResult.commitments
              );

              toast.success("Successfully committed to tier!", {
                id: loadingToast,
              });
              return { success: true, txHash: commitResult.txHash };
            } else {
              // No tier commitments found, might be a transaction failure
              throw new Error("No tier commitments found after transaction");
            }
          } catch (verificationError) {
            console.error("Error verifying deposit:", verificationError);
            // Even if verification fails, assume success as transaction went through
            toast.success(
              "Transaction successful, but verification failed. Please check your balance.",
              {
                id: loadingToast,
              }
            );
            return { success: true, txHash: commitResult.txHash };
          }
        } else {
          // If no smart wallet is available, show an error
          const errorMessage = "Smart wallet is required for deposits";
          console.error(errorMessage);
          toast.error(errorMessage, { id: loadingToast });
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        console.error("Error in depositToPool:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setError(errorMessage);
        toast.error(errorMessage, { id: loadingToast });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      smartWalletBalance,
      refreshSmartWalletBalance,
    ]
  );

  return {
    isLoading: isLoading || smartWalletIsLoading,
    error,
    depositToPool,
  };
}
