import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import showToast from "@/utils/toast";
import { DepositService } from "../lib/services/blockchain/deposit.service";
import { useSmartWallet } from "./useSmartWallet";
import { useSmartWalletBalance } from "./useSmartWalletBalance";
import {
  ensureSmartWallet,
  standardizeSmartWalletError,
} from "../lib/utils/smartWalletUtils";

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

      // Check if amount is valid - allow 0 for variable price tiers
      if (amount < 0) {
        return {
          success: false,
          error: "Amount must be greater than or equal to 0",
        };
      }

      // Clear any previous errors
      setError(null);
      setIsLoading(true);

      // Create a toast for loading status
      const loadingToast = showToast.loading("Processing your deposit...");

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

        // Amount is already in base units, no need to convert
        const commitAmount = BigInt(amount);

        console.log("Commit validation:", {
          amount,
          commitAmount: commitAmount.toString(),
          isVariablePriceTier: tier.is_variable_price,
          tierPrice: tier.price.toString(),
          tierDetails: tier,
        });

        // For 0 amount variable price tiers, we'll skip some validation requirements
        const shouldSkipRequirements = amount === 0 && tier.is_variable_price;

        // Check deposit requirements
        const { requirements, error: requirementsError } =
          await depositService.checkDepositRequirements(
            poolAddress,
            tierId,
            commitAmount, // Pass BigInt amount
            shouldSkipRequirements
          );

        console.log("Deposit requirements:", {
          requirements,
          tierPrice: tier.price.toString(),
          shouldSkipRequirements,
        });

        if (requirementsError) {
          throw new Error(requirementsError);
        }

        // Check if all requirements are met
        const unmetRequirements = Object.entries(requirements)
          .filter(([_, value]) => !value)
          .map(([key]) => key);

        // Log each requirement status
        console.log(
          "Requirements details:",
          Object.entries(requirements).map(
            ([key, value]) => `${key}: ${value ? "✅" : "❌"}`
          )
        );

        if (unmetRequirements.length > 0) {
          // More detailed error message that includes which requirements failed and the current status
          const errorMsg = `Deposit requirements not met: ${unmetRequirements.join(
            ", "
          )}`;
          console.error(errorMsg, {
            depositAmount: amount,
            isZeroAmount: amount === 0,
            isVariablePriceTier: tier.is_variable_price,
            shouldSkipRequirements,
            requirements,
          });
          throw new Error(errorMsg);
        }

        // Ensure smart wallet is available, with DB synchronization
        const smartWalletResult = await ensureSmartWallet(user, loadingToast);

        if (!smartWalletResult.success) {
          throw new Error(
            smartWalletResult.error ||
              "Smart wallet sync in progress, please retry"
          );
        }

        // Now that we've verified wallet exists, use the original smartWalletAddress from the hook
        // This ensures we're using the same instance that callContractFunction is tied to
        if (!smartWalletAddress || !callContractFunction) {
          throw new Error(
            "Smart wallet functions not available. Please try again later."
          );
        }

        console.log("Using smart wallet for deposit:", smartWalletAddress);
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // CRITICAL: Check if user has enough USDC balance in their smart wallet
        if (amount > 0) {
          try {
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
              showToast.error(errorMessage, { id: loadingToast });
              return { success: false, error: errorMessage };
            }
          } catch (balanceError) {
            console.warn(
              "Could not verify balance, proceeding with transaction anyway:",
              balanceError
            );
          }
        }

        // Use smart wallet address for allowance check
        let hasEnoughAllowance = false;
        let currentAllowance = BigInt(0);

        try {
          const allowanceCheck = await depositService.checkUSDCAllowance(
            smartWalletAddress,
            poolAddress,
            commitAmount
          );
          hasEnoughAllowance = allowanceCheck.hasEnoughAllowance;
          currentAllowance = allowanceCheck.currentAllowance;

          console.log("USDC allowance check (smart wallet):", {
            hasEnoughAllowance,
            currentAllowance: currentAllowance.toString(),
            requiredAmount: commitAmount.toString(),
          });
        } catch (allowanceError) {
          console.warn(
            "Error checking allowance, will attempt approval if needed:",
            allowanceError
          );
          // If allowance check fails, we'll assume we need to approve
          hasEnoughAllowance = false;
        }

        // Approve USDC if needed - skip for 0 amount variable price tiers
        if (!hasEnoughAllowance && amount > 0) {
          showToast.loading("Approving USDC...", { id: loadingToast });
          console.log("Approving USDC with smart wallet:", {
            poolAddress,
            commitAmount: commitAmount.toString(),
          });

          try {
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

            // We'll proceed without double-checking the allowance as it might fail again
          } catch (approvalError) {
            console.error("USDC approval error:", approvalError);
            const errorMessage =
              approvalError instanceof Error
                ? approvalError.message
                : "Failed to approve USDC";
            showToast.error(errorMessage, { id: loadingToast });
            return { success: false, error: errorMessage };
          }
        }

        // Commit to tier
        showToast.loading("Initiating deposit transaction...", {
          id: loadingToast,
        });
        console.log("Committing to tier with smart wallet:", {
          poolAddress,
          tierId,
          commitAmount: commitAmount.toString(),
          amount: amount,
          isZero: amount === 0,
          shouldSkipRequirements,
        });

        // For 0 amount variable price tiers, we'll modify the commit process to bypass contract checks
        console.log(
          `Preparing to commit ${
            amount === 0 ? "FREE tier (0 amount)" : "PAID tier"
          }`
        );

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
        showToast.loading("Waiting for transaction confirmation...", {
          id: loadingToast,
        });
        const receipt = await provider.waitForTransaction(
          commitResult.txHash as string
        );

        // Verify transaction was successful
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        // Verify balance changes - with timeout and error handling
        showToast.loading("Verifying deposit...", { id: loadingToast });

        // Wait a bit for blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Use a single verification attempt with timeout
        let verificationSuccess = false;

        try {
          // Set a timeout for verification
          const verificationPromise = new Promise(async (resolve, reject) => {
            try {
              // Check if user's tier commitment was recorded
              const userTiersResult =
                await depositService.getUserTierCommitments(
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
                verificationSuccess = true;
                resolve(true);
              } else {
                // No tier commitments found, might be a transaction failure
                reject(
                  new Error("No tier commitments found after transaction")
                );
              }
            } catch (error) {
              reject(error);
            }
          });

          // Set a timeout for verification
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Verification timed out")), 10000)
          );

          // Race the verification against timeout
          await Promise.race([verificationPromise, timeoutPromise]);

          // If we get here, verification succeeded
          showToast.success("Successfully committed to tier!", {
            id: loadingToast,
          });
          return { success: true, txHash: commitResult.txHash };
        } catch (verificationError) {
          console.warn("Verification error or timeout:", verificationError);

          // Even if verification fails, assume success if the transaction was confirmed
          if (receipt && receipt.status === 1) {
            showToast.success(
              "Transaction confirmed on-chain! You have successfully committed to the tier.",
              { id: loadingToast }
            );
            return { success: true, txHash: commitResult.txHash };
          } else {
            // This is unusual - transaction says it confirmed but verification failed completely
            showToast.error(
              "Transaction appears to have completed, but verification failed. Please check your commitments later.",
              { id: loadingToast }
            );
            return {
              success: true,
              txHash: commitResult.txHash,
              error: "Verification failed, please check later",
            };
          }
        }
      } catch (error) {
        console.error("Error in depositToPool:", error);

        // Use the standardized error message utility
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        // If it's a smart wallet error (different from original), handle accordingly
        if (standardizedError !== errorMessage) {
          setError(standardizedError);
          showToast.error(standardizedError, { id: loadingToast });
          return { success: false, error: standardizedError };
        }

        setError(errorMessage);
        showToast.error(errorMessage, { id: loadingToast });
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
