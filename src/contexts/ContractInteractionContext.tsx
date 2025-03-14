"use client";

import React, { createContext, useContext, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import { ContractPool } from "../lib/contracts/StageDotFunPool";

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

// Define the context type
interface ContractInteractionContextType {
  isLoading: boolean;
  error: string | null;
  /** Creates a pool on the blockchain using the user's wallet */
  createPool: (
    name: string,
    uniqueId: string,
    symbol: string,
    endTime: number,
    targetAmount: number,
    minCommitment: number
  ) => Promise<any>;
  /** Creates a pool on the blockchain and then adds it to the database */
  createPoolWithDatabase: (
    poolData: PoolCreationData,
    endTimeUnix: number
  ) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    txHash?: string;
  }>;
  /** Deposits funds to a pool on the blockchain */
  depositToPool: (poolId: string, amount: number) => Promise<any>;
  /** Withdraws funds from a pool on the blockchain using the user's wallet */
  withdrawFromPool: (
    poolAddress: string,
    amount: number,
    destinationAddress: string
  ) => Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
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
  });

// Provider component
export const ContractInteractionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const contractInteraction = useContractInteractionHook();
  const { ready: privyReady } = usePrivy();
  const { ready: walletsReady } = useWallets();

  const contextValue = {
    ...contractInteraction,
    privyReady,
    walletsReady,
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
