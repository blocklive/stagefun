import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { usePrivy } from "@privy-io/react-auth";
import {
  RevenueService,
  RevenueResult,
} from "../lib/services/blockchain/revenue.service";
import { useSmartWallet } from "./useSmartWallet";
import { useSmartWalletBalance } from "./useSmartWalletBalance";

export interface UseRevenueDepositResult {
  isLoading: boolean;
  error: string | null;
  depositRevenue: (
    poolAddress: string,
    amount: number
  ) => Promise<RevenueResult>;
}

export function useRevenueDeposit(): UseRevenueDepositResult {
  const { user } = usePrivy();
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const {
    balance: smartWalletBalance,
    isLoading: smartWalletBalanceLoading,
    refresh: refreshSmartWalletBalance,
  } = useSmartWalletBalance();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(async () => {
    return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  }, []);

  const depositRevenue = useCallback(
    async (poolAddress: string, amount: number): Promise<RevenueResult> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      if (!smartWalletAddress) {
        return {
          success: false,
          error:
            "Smart wallet not available. Please ensure you have a smart wallet configured.",
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
      const loadingToast = toast.loading("Processing revenue deposit...");

      try {
        // Get provider for service initialization
        const provider = await getProvider();

        // Create revenue service
        const revenueService = new RevenueService(provider);

        // Convert amount to wei
        const usdcDecimals = 6; // USDC has 6 decimals
        const amountBigInt = ethers.parseUnits(amount.toString(), usdcDecimals);
        const amountFormatted = ethers.formatUnits(amountBigInt, usdcDecimals);

        // Refresh smart wallet balance to ensure we have the latest data
        await refreshSmartWalletBalance();

        // Check USDC balance in smart wallet
        const userBalanceInWei = ethers.parseUnits(
          smartWalletBalance || "0",
          6
        );

        console.log("USDC Balance check:", {
          balance: smartWalletBalance,
          required: amountFormatted,
          hasEnough: userBalanceInWei >= amountBigInt,
        });

        if (userBalanceInWei < amountBigInt) {
          const errorMessage = `Insufficient USDC balance in smart wallet. You have ${smartWalletBalance} USDC but trying to deposit ${amountFormatted} USDC`;
          toast.error(errorMessage, { id: loadingToast });
          return { success: false, error: errorMessage };
        }

        // Check allowance and provide approval if needed
        toast.loading("Checking USDC allowance...", { id: loadingToast });

        // Check current allowance
        const allowanceCheck = await revenueService.checkUSDCAllowance(
          smartWalletAddress,
          poolAddress,
          amountBigInt
        );

        console.log("Current allowance:", {
          allowance: allowanceCheck.currentAllowance.toString(),
          required: amountBigInt.toString(),
          needsApproval: allowanceCheck.currentAllowance < amountBigInt,
        });

        // Handle approval if needed
        if (!allowanceCheck.hasEnoughAllowance) {
          toast.loading("Approving USDC with smart wallet...", {
            id: loadingToast,
          });

          // Use smart wallet to approve USDC
          const approvalResult =
            await revenueService.approveUSDCWithSmartWallet(
              callContractFunction,
              poolAddress,
              amountBigInt
            );

          if (!approvalResult.success) {
            throw new Error(approvalResult.error || "Failed to approve USDC");
          }

          toast.loading("USDC approval sent, waiting for confirmation...", {
            id: loadingToast,
          });

          // Wait for the transaction to be mined
          await provider.waitForTransaction(approvalResult.txHash as string);

          toast.success("USDC approval confirmed!", { id: loadingToast });
        }

        // Use smart wallet to deposit revenue
        toast.loading("Initiating revenue deposit...", { id: loadingToast });

        const depositResult =
          await revenueService.depositRevenueWithSmartWallet(
            callContractFunction,
            poolAddress,
            amountBigInt
          );

        if (!depositResult.success) {
          throw new Error(depositResult.error || "Failed to deposit revenue");
        }

        toast.loading("Revenue deposit sent, waiting for confirmation...", {
          id: loadingToast,
        });

        // Wait for the transaction to be mined
        await provider.waitForTransaction(depositResult.txHash as string);

        toast.success("Revenue deposit successful!", { id: loadingToast });

        // Refresh smart wallet balance
        refreshSmartWalletBalance();

        return {
          success: true,
          txHash: depositResult.txHash,
        };
      } catch (error) {
        console.error("Error in depositRevenue:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        // Check for common error types
        if (errorMessage.includes("user rejected transaction")) {
          const rejectedMessage = "Transaction rejected by user";
          toast.error(rejectedMessage, { id: loadingToast });
          return { success: false, error: rejectedMessage };
        } else if (errorMessage.includes("insufficient funds")) {
          const fundsMessage = "Insufficient funds for transaction";
          toast.error(fundsMessage, { id: loadingToast });
          return { success: false, error: fundsMessage };
        }

        setError(errorMessage);
        toast.error(errorMessage, { id: loadingToast });

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [
      user,
      smartWalletAddress,
      callContractFunction,
      smartWalletBalance,
      refreshSmartWalletBalance,
      getProvider,
    ]
  );

  return {
    isLoading: isLoading || smartWalletBalanceLoading,
    error,
    depositRevenue,
  };
}
