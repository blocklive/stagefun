"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useContractInteraction as useContractInteractionHook } from "../hooks/useContractInteraction";
import {
  ContractPool,
  ContractCommitment,
} from "../lib/contracts/PoolCommitment";

// Define the context type
interface ContractInteractionContextType {
  isLoading: boolean;
  error: string | null;
  createPool: (poolId: string, targetAmount: number) => Promise<any>;
  commitToPool: (poolId: string, amount: number) => Promise<any>;
  getPool: (poolId: string) => Promise<ContractPool | null>;
  getPoolCommitments: (poolId: string) => Promise<ContractCommitment[]>;
  getUserCommitment: (userAddress: string, poolId: string) => Promise<string>;
  getBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
}

// Create the context
export const ContractInteractionContext =
  createContext<ContractInteractionContextType>({
    isLoading: false,
    error: null,
    createPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    commitToPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getPool: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getPoolCommitments: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getUserCommitment: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    getBalance: async () => {
      throw new Error("ContractInteractionContext not initialized");
    },
    walletAddress: null,
  });

// Provider component
export const ContractInteractionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const contractInteraction = useContractInteractionHook();

  return (
    <ContractInteractionContext.Provider value={contractInteraction}>
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
