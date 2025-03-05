"use client";

import React, { createContext, useContext, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import { ContractPool } from "../lib/contracts/StageDotFunPool";

// Define the context type
interface ContractInteractionContextType {
  isLoading: boolean;
  error: string | null;
  createPool: (name: string, ticker: string) => Promise<any>;
  depositToPool: (poolId: string, amount: number) => Promise<any>;
  getPool: (poolId: string) => Promise<ContractPool | null>;
  getPoolLpHolders: (poolId: string) => Promise<string[]>;
  getUserPoolBalance: (userAddress: string, poolId: string) => Promise<string>;
  getBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
  walletsReady: boolean;
  privyReady: boolean;
}

// Create the context
export const ContractInteractionContext =
  createContext<ContractInteractionContextType>({
    isLoading: false,
    error: null,
    createPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    depositToPool: async () => {
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
