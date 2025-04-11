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

  // Claim refund functionality has been moved to a dedicated hook: useClaimRefund

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
