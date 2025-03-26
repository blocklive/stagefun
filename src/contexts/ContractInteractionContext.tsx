"use client";

import React, { createContext, useContext, useCallback, useState } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import { usePoolCreationContract } from "../hooks/usePoolCreationContract";
import { useDeposit } from "../hooks/useDeposit";
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

// Define the context type
export type ContractInteractionContextType = {
  privyReady: boolean;
  walletsReady: boolean;
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
  getPoolDetails: (poolAddress: string) => Promise<any>;
  depositToPool: (
    poolAddress: string,
    amount: number,
    tierId: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  withdrawFromPool: (
    poolAddress: string,
    amount: number,
    destinationAddress: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  updatePoolName: (
    poolAddress: string,
    newName: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  updateMinCommitment: (
    poolAddress: string,
    newMinCommitment: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  approveWithRetry: (
    poolAddress: string,
    milestoneId: number
  ) => Promise<{ success: boolean; error?: string }>;
  claimRefund: (poolAddress: string) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    data?: any;
  }>;
  distributeRevenue: (
    poolAddress: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  isLoading: boolean;
  error: string | null;
  getPool: (poolId: string) => Promise<ContractPool | null>;
  getPoolLpHolders: (poolId: string) => Promise<string[]>;
  getUserPoolBalance: (userAddress: string, poolId: string) => Promise<string>;
  getBalance: (userAddress: string) => Promise<string>;
  getNativeBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
};

// Create the context
export const ContractInteractionContext =
  createContext<ContractInteractionContextType>({
    isLoading: false,
    error: null,
    createPool: async (
      name: string,
      uniqueId: string,
      symbol: string,
      endTime: number,
      targetAmount: number,
      minCommitment: number,
      tiers: []
    ) => {
      throw new Error("ContractInteractionContext not initialized");
    },
    createPoolWithDatabase: async (
      poolData: PoolCreationData,
      endTimeUnix: number
    ) => {
      throw new Error("ContractInteractionContext not initialized");
    },
    depositToPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    withdrawFromPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    updatePoolName: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    updateMinCommitment: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    distributeRevenue: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getPoolLpHolders: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getUserPoolBalance: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getBalance: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getNativeBalance: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    walletAddress: null,
    walletsReady: false,
    privyReady: false,
  } as any);

// Provider component
export const ContractInteractionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const contractInteraction = useContractInteractionHook();
  const poolCreationContract = usePoolCreationContract();
  const { depositToPool: depositToPoolHook } = useDeposit();
  const { ready: privyReady, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Distribute revenue function
  const distributeRevenue = async (
    poolAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> => {
    if (!wallets || wallets.length === 0) {
      return {
        success: false,
        error: "No wallet connected",
      };
    }

    try {
      // Get the embedded wallet
      const embeddedWallet = wallets.find(
        (wallet: any) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        return {
          success: false,
          error:
            "No embedded wallet found. Please try logging out and logging in again.",
        };
      }

      // Get the provider and create contract instances
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Create contract instance for the pool
      const poolContract = new ethers.Contract(
        poolAddress,
        StageDotFunPoolABI,
        signer
      );

      console.log("Distributing revenue:", {
        poolAddress,
        amount,
      });

      // Create contract interface for pool
      const poolInterface = new ethers.Interface(StageDotFunPoolABI);

      // Based on the error, it seems the distributeRevenue function doesn't take any arguments
      const distributeData = poolInterface.encodeFunctionData(
        "distributeRevenue",
        []
      );

      // Prepare the transaction request
      const distributeRequest = {
        to: poolAddress,
        data: distributeData,
        value: "0",
      };

      // Set UI options for the transaction
      const uiOptions = {
        description: `Distributing revenue to pool patrons`,
        buttonText: "Distribute Revenue",
        transactionInfo: {
          title: "Distribute Revenue",
          action: "Distribute Revenue to Patrons",
          contractInfo: {
            name: "StageDotFun Pool",
          },
        },
      };

      // Send the transaction
      console.log("Sending distribute transaction", distributeRequest);
      const txHash = await sendTransaction(distributeRequest, {
        uiOptions,
      });

      console.log("Distribution transaction sent:", txHash);

      // Wait for transaction to be mined
      const receipt = await ethersProvider.waitForTransaction(txHash.hash);
      console.log("Distribution transaction receipt:", receipt);

      if (!receipt?.status) {
        return {
          success: false,
          error: "Transaction failed on chain",
        };
      }

      return {
        success: true,
        txHash: txHash.hash,
      };
    } catch (error) {
      console.error("Error distributing revenue:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to distribute revenue",
      };
    }
  };

  // Claim refund from a pool
  const claimRefund = async (
    contractAddress: string
  ): Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    data?: any;
  }> => {
    if (!wallets || wallets.length === 0) {
      return {
        success: false,
        error: "No wallet connected",
      };
    }

    try {
      const embeddedWallet = wallets.find(
        (wallet: any) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        return {
          success: false,
          error:
            "No embedded wallet found. Please try logging out and logging in again.",
        };
      }

      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const userAddress = await signer.getAddress();

      // Get the pool contract
      const poolContract = new ethers.Contract(
        contractAddress,
        StageDotFunPoolABI,
        signer
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
        (currentTime > endTime && totalDeposits < targetAmount); // End time passed and target not met

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

      // Try to update the pool status if it's not already in FAILED state
      if (poolDetails._status !== 5) {
        console.log(
          "Pool is eligible for refunds but status is not FAILED. Updating status..."
        );
        try {
          const checkStatusTx = await poolContract.checkPoolStatus();
          await checkStatusTx.wait();
          console.log("Pool status check completed");

          // Check status again
          const updatedDetails = await poolContract.getPoolDetails();
          console.log("Updated pool status:", updatedDetails._status);
        } catch (statusError) {
          console.error("Error updating pool status:", statusError);
          // Continue anyway since we'll try a direct refund
        }
      }

      // Get LP token address from pool
      const lpTokenAddress = poolDetails._lpTokenAddress;
      console.log("LP Token address:", lpTokenAddress);

      // Get LP token contract
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        StageDotFunLiquidityABI,
        signer
      );

      // Check LP token balance
      const lpBalance = await lpTokenContract.balanceOf(userAddress);
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
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
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

      // Try to call claimRefund directly
      console.log("Attempting to claim refund...");
      try {
        // Create a direct transaction to call claimRefund
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const refundData = poolInterface.encodeFunctionData("claimRefund", []);

        const refundRequest = {
          to: contractAddress,
          data: refundData,
          value: "0",
        };

        const uiOptions = {
          description: `Claiming refund from pool`,
          buttonText: "Claim Refund",
          transactionInfo: {
            title: "Claim Refund",
            action: "Claim Refund from Pool",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        const txHash = await sendTransaction(refundRequest, {
          uiOptions,
        });

        console.log("Refund transaction sent:", txHash);
        const receipt = await ethersProvider.waitForTransaction(txHash.hash);
        console.log("Refund transaction receipt:", receipt);

        if (!receipt?.status) {
          return {
            success: false,
            error: "Transaction failed on chain",
            data: {
              receipt,
              poolStatus: poolDetails._status,
            },
          };
        }

        return {
          success: true,
          txHash: txHash.hash,
          data: {
            lpBalance: lpBalance.toString(),
            poolStatus: poolDetails._status,
          },
        };
      } catch (directRefundError) {
        console.error("Direct refund attempt failed:", directRefundError);
        return {
          success: false,
          error:
            "Failed to claim refund. The transaction was rejected by the blockchain.",
          data: {
            error: directRefundError,
            poolStatus: poolDetails._status,
          },
        };
      }
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

  // Get user's native MON balance
  const getNativeBalance = useCallback(
    async (userAddress: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/zerion/balance?address=${userAddress}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch balance: ${response.statusText}`);
        }

        const data = await response.json();
        return data.balance || "0";
      } catch (err: any) {
        console.error("Error getting native MON balance:", err);
        setError(err.message || "Error getting native MON balance");
        return "0";
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update depositToPool to use the new hook
  const depositToPool = async (
    poolAddress: string,
    amount: number,
    tierId: number
  ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
    return depositToPoolHook(poolAddress, amount, tierId);
  };

  const contextValue: ContractInteractionContextType = {
    ...contractInteraction,
    ...poolCreationContract,
    privyReady,
    walletsReady,
    distributeRevenue,
    claimRefund,
    getPoolDetails: async () => ({ success: false, error: "Not implemented" }),
    approveWithRetry: async () => ({
      success: false,
      error: "Not implemented",
    }),
    getNativeBalance,
    isLoading:
      contractInteraction.isLoading ||
      poolCreationContract.isLoading ||
      isLoading,
    error: contractInteraction.error || poolCreationContract.error || error,
    walletAddress: contractInteraction.walletAddress,
    depositToPool,
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
