"use client";

import React, { createContext, useContext, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import {
  ContractPool,
  StageDotFunPoolABI,
} from "../lib/contracts/StageDotFunPool";
import { ethers } from "ethers";

// Define the interface for pool creation data
interface PoolCreationData {
  id: string;
  name: string;
  ticker: string;
  description: string;
  target_amount: number;
  min_commitment: number;
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
}

// Update the ContractResult type to include data property
interface ContractResult {
  success: boolean;
  error?: string;
  txHash?: string;
  data?: any;
}

// Define the context type
export interface ContractInteractionContextType {
  createPool: (
    data: PoolCreationData
  ) => Promise<{ success: boolean; error?: string; poolAddress?: string }>;
  getPoolDetails: (poolAddress: string) => Promise<any>;
  depositToPool: (
    poolAddress: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  withdrawFromPool: (
    poolAddress: string,
    amount: number,
    destinationAddress: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  approveWithRetry: (
    poolAddress: string,
    milestoneId: number
  ) => Promise<{ success: boolean; error?: string }>;
  claimRefund: (
    poolAddress: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
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
  walletsReady: boolean;
  privyReady: boolean;
}

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
      minCommitment: number
    ) => {
      throw new Error("ContractInteractionContext not initialized");
    },
    createPoolWithDatabase: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    depositToPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    withdrawFromPool: async () => {
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
  const { ready: privyReady } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();

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
  ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
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

      const poolContract = new ethers.Contract(
        contractAddress,
        StageDotFunPoolABI,
        signer
      );

      const tx = await poolContract.claimRefund();
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error claiming refund:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to claim refund",
      };
    }
  };

  const contextValue: ContractInteractionContextType = {
    ...contractInteraction,
    privyReady,
    walletsReady,
    distributeRevenue,
    claimRefund,
    getPoolDetails: async () => ({ success: false, error: "Not implemented" }),
    approveWithRetry: async () => ({
      success: false,
      error: "Not implemented",
    }),
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
