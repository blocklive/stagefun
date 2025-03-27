"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import { usePoolCreationContract } from "../hooks/usePoolCreationContract";
import { useDeposit } from "../hooks/useDeposit";
import { useSmartWallet } from "../hooks/useSmartWallet";
import {
  ContractPool,
  StageDotFunPoolABI,
  StageDotFunLiquidityABI,
  ERC20_ABI,
} from "../lib/contracts/StageDotFunPool";
import { ethers } from "ethers";

// Define the interface for pool creation data
interface PoolCreationData {
  id: string;
  name: string;
  ticker: string;
  description: string;
  target_amount: number;
  currency: string;
  token_amount: number;
  token_symbol: string;
  location: string;
  venue: string;
  status: string;
  funding_stage: string;
  ends_at: string;
  creator_id: string;
  raised_amount: number;
  image_url: string | null;
  social_links: any;
  tiers?: any[];
  cap_amount?: number;
}

// Update the ContractResult type to include data property
interface ContractResult {
  success: boolean;
  error?: string;
  txHash?: string;
  data?: any;
}

// Define the context type - merging all hook interfaces
export type ContractInteractionContextType = ReturnType<
  typeof useContractInteractionHook
> & {
  createPool: (
    name: string,
    uniqueId: string,
    symbol: string,
    endTime: number,
    targetAmount: number,
    minCommitment: number,
    tiers: {
      name: string;
      price: number;
      nftMetadata: string;
      isVariablePrice: boolean;
      minPrice: number;
      maxPrice: number;
      maxPatrons: number;
    }[]
  ) => Promise<any>;
  createPoolWithDatabase: (
    poolData: PoolCreationData,
    endTimeUnix: number
  ) => Promise<{
    success: boolean;
    error?: string;
    poolAddress?: string;
    txHash?: string;
    data?: any;
  }>;
  depositToPool: (
    poolAddress: string,
    amount: number,
    tierId: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  claimRefund: (poolAddress: string) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    data?: any;
  }>;
  getPoolDetails: (poolAddress: string) => Promise<any>;
  approveWithRetry: (
    poolAddress: string,
    milestoneId: number
  ) => Promise<{ success: boolean; error?: string }>;
};

// Create the context with a default value that will be overridden
export const ContractInteractionContext =
  createContext<ContractInteractionContextType>(
    {} as ContractInteractionContextType
  );

// Provider component
export const ContractInteractionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const contractInteraction = useContractInteractionHook();
  const poolCreationContract = usePoolCreationContract();
  const { depositToPool: depositToPoolHook } = useDeposit();
  const { ready: privyReady } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to get a provider for read operations
  const getProvider = useCallback(async () => {
    if (!walletsReady || !wallets.length) {
      throw new Error("No wallets available - please connect your wallet");
    }

    try {
      console.log(
        "Available wallets:",
        wallets.map((w) => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId,
        }))
      );

      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        console.error(
          "No embedded wallet found. Available wallets:",
          wallets.map((w) => w.walletClientType)
        );
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

  // Claim refund from a pool - updated to use smart wallet
  const claimRefund = async (
    contractAddress: string
  ): Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    data?: any;
  }> => {
    try {
      // Check if smart wallet is available
      if (!smartWalletAddress) {
        return {
          success: false,
          error: "Smart wallet not available. Please log in again.",
        };
      }

      // First, get a provider to check eligibility and pool details
      const ethersProvider = await getProvider();

      // Create a read-only contract instance to check pool status
      const poolContract = new ethers.Contract(
        contractAddress,
        StageDotFunPoolABI,
        ethersProvider
      );

      // Get pool details to check status
      console.log("Getting pool details...");
      const poolDetails = await poolContract.getPoolDetails();
      console.log("Pool status:", poolDetails._status);

      // Check if the pool is eligible for refunds based on end time and target amount
      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = Number(poolDetails._endTime);
      const totalDeposits = Number(poolDetails._totalDeposits);
      const targetAmount = Number(poolDetails._targetAmount);

      console.log("Pool eligibility check:", {
        currentTime,
        endTime,
        totalDeposits,
        targetAmount,
        hasEnded: currentTime > endTime,
        targetMet: totalDeposits >= targetAmount,
      });

      const isEligibleForRefund =
        poolDetails._status === 5 || // Already in FAILED state
        (currentTime > endTime && totalDeposits < targetAmount);

      if (!isEligibleForRefund) {
        console.log(
          "Pool is not eligible for refunds based on time and target"
        );
        return {
          success: false,
          error:
            "This pool is not eligible for refunds. The end time must have passed without meeting the target amount.",
          data: {
            poolStatus: poolDetails._status,
            currentTime,
            endTime,
            totalDeposits,
            targetAmount,
          },
        };
      }

      // Get LP token address from pool
      const lpTokenAddress = poolDetails._lpTokenAddress;
      console.log("LP Token address:", lpTokenAddress);

      // Get LP token contract to check balance
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        StageDotFunLiquidityABI,
        ethersProvider
      );

      // Check LP token balance for the smart wallet
      const lpBalance = await lpTokenContract.balanceOf(smartWalletAddress);
      console.log("LP token balance:", lpBalance.toString());

      if (lpBalance <= BigInt(0)) {
        return {
          success: false,
          error: "No LP tokens to refund",
          data: { lpBalance: lpBalance.toString() },
        };
      }

      // Check USDC balance of the pool contract
      const usdcAddress = await poolContract.depositToken();
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ERC20_ABI,
        ethersProvider
      );
      const poolUsdcBalance = await usdcContract.balanceOf(contractAddress);
      console.log("Pool USDC balance:", poolUsdcBalance.toString());

      if (poolUsdcBalance < lpBalance) {
        return {
          success: false,
          error: "Pool doesn't have enough USDC to refund",
          data: {
            poolUsdcBalance: poolUsdcBalance.toString(),
            lpBalance: lpBalance.toString(),
          },
        };
      }

      // Try to update the pool status if it's not already in FAILED state
      if (poolDetails._status !== 5) {
        console.log(
          "Pool is eligible for refunds but status is not FAILED. Attempting to update status..."
        );
        try {
          // Use smart wallet to call checkPoolStatus
          const statusResult = await callContractFunction(
            contractAddress as `0x${string}`,
            StageDotFunPoolABI,
            "checkPoolStatus",
            [],
            "Update pool status before refund"
          );

          if (!statusResult.success) {
            console.warn(
              "Failed to update pool status, but continuing with refund attempt"
            );
          } else {
            console.log("Pool status check completed");
          }
        } catch (statusError) {
          console.error("Error updating pool status:", statusError);
          // Continue anyway since we'll try a direct refund
        }
      }

      // Use smart wallet to claim refund
      console.log("Attempting to claim refund with smart wallet...");
      const result = await callContractFunction(
        contractAddress as `0x${string}`,
        StageDotFunPoolABI,
        "claimRefund",
        [],
        "Claim refund from pool"
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to claim refund",
          data: {
            poolStatus: poolDetails._status,
          },
        };
      }

      console.log("Refund claimed successfully:", result.txHash);
      return {
        success: true,
        txHash: result.txHash,
        data: {
          lpBalance: lpBalance.toString(),
          poolStatus: poolDetails._status,
        },
      };
    } catch (error) {
      console.error("Error claiming refund:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to claim refund",
        data: { error },
      };
    }
  };

  // Update depositToPool to use the hook implementation
  const depositToPool = async (
    poolAddress: string,
    amount: number,
    tierId: number
  ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
    return depositToPoolHook(poolAddress, amount, tierId);
  };

  // Placeholder stubs for functions needed by the interface but not implemented yet
  const getPoolDetails = async () => ({
    success: false,
    error: "Not implemented",
  });
  const approveWithRetry = async () => ({
    success: false,
    error: "Not implemented",
  });

  // Create the context value, combining all hooks
  const contextValue: ContractInteractionContextType = {
    ...contractInteraction,
    ...poolCreationContract,
    depositToPool,
    claimRefund,
    getPoolDetails,
    approveWithRetry,
    isLoading:
      contractInteraction.isLoading ||
      poolCreationContract.isLoading ||
      isLoading,
    error: contractInteraction.error || poolCreationContract.error || error,
  };

  return (
    <ContractInteractionContext.Provider value={contextValue}>
      {children}
    </ContractInteractionContext.Provider>
  );
};

// Hook to use the context
export function useContractInteraction() {
  const context = useContext(ContractInteractionContext);
  if (context === undefined) {
    throw new Error(
      "useContractInteraction must be used within a ContractInteractionProvider"
    );
  }
  return context;
}
