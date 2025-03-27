import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  DepositService,
  DepositResult,
} from "../lib/services/blockchain/deposit.service";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";

export interface UseDepositResult {
  isLoading: boolean;
  error: string | null;
  depositToPool: (
    poolAddress: string,
    amount: number,
    tierId: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

interface TransactionResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

export function useDeposit(): UseDepositResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(async () => {
    if (!walletsReady || !wallets.length) {
      throw new Error("No wallets available - please connect your wallet");
    }

    try {
      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        throw new Error(
          "No embedded wallet found. Please try logging out and logging in again."
        );
      }

      const provider = await embeddedWallet.getEthereumProvider();
      return new ethers.BrowserProvider(provider);
    } catch (error) {
      console.error("Error creating provider:", error);
      throw error;
    }
  }, [walletsReady, wallets]);

  const depositToPool = useCallback(
    async (
      poolAddress: string,
      amount: number,
      tierId: number
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!user) {
        throw new Error("User not logged in");
      }

      setIsLoading(true);
      setError(null);
      const loadingToast = toast.loading("Checking USDC allowance...");

      try {
        // Get provider and signer
        const provider = await getProvider();
        const signer = await provider.getSigner();
        const depositService = new DepositService(provider, signer);

        // Check if the pool is unfunded (status = 2)
        // Get the pool contract
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          provider
        );

        const poolDetails = await poolContract.getPoolDetails();
        const poolStatus = Number(poolDetails._status);

        if (poolStatus === 2) {
          // 2 = FAILED status
          throw new Error(
            "This pool did not reach its funding target and is no longer accepting deposits"
          );
        }

        // Get tier details
        const {
          success: tierSuccess,
          tier,
          error: tierError,
        } = await depositService.getTierDetails(poolAddress, tierId);

        console.log("Tier details from contract:", {
          tier,
          tierPrice: tier?.price?.toString(),
          isVariablePrice: tier?.isVariablePrice,
          minPrice: tier?.minPrice?.toString(),
          maxPrice: tier?.maxPrice?.toString(),
        });

        if (!tierSuccess || !tier) {
          throw new Error(tierError || "Failed to get tier details");
        }

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

        const { hasEnoughAllowance, currentAllowance } =
          await depositService.checkUSDCAllowance(
            await signer.getAddress(),
            poolAddress,
            commitAmount
          );

        console.log("USDC allowance check:", {
          hasEnoughAllowance,
          currentAllowance: currentAllowance.toString(),
          requiredAmount: commitAmount.toString(),
        });

        // Approve USDC if needed
        if (!hasEnoughAllowance) {
          toast.loading("Approving USDC...", { id: loadingToast });
          console.log("Approving USDC:", {
            poolAddress,
            commitAmount: commitAmount.toString(),
          });
          const approvalResult = await depositService.approveUSDC(
            poolAddress,
            commitAmount
          );

          if (!approvalResult.success) {
            throw new Error(approvalResult.error || "Failed to approve USDC");
          }

          console.log("USDC approval result:", approvalResult);
          // Wait for approval transaction to be mined
          await provider.waitForTransaction(approvalResult.txHash as string);
        }

        // Commit to tier
        toast.loading("Initiating deposit transaction...", {
          id: loadingToast,
        });
        console.log("Committing to tier:", {
          poolAddress,
          tierId,
          commitAmount: commitAmount.toString(),
        });
        const commitResult = await depositService.commitToTier(
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
        await provider.waitForTransaction(commitResult.txHash as string);

        toast.success("Successfully committed to tier!", { id: loadingToast });
        return { success: true, txHash: commitResult.txHash };
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
    [user, getProvider]
  );

  return {
    isLoading,
    error,
    depositToPool,
  };
}
