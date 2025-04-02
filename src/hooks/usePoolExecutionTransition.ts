import { useState, useCallback } from "react";
import { useSmartWallet } from "./useSmartWallet";
import { usePrivy } from "@privy-io/react-auth";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";

export function usePoolExecutionTransition() {
  const [isLoading, setIsLoading] = useState(false);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const { user } = usePrivy();

  const beginExecution = useCallback(
    async (
      poolAddress: string
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      try {
        setIsLoading(true);

        if (!user) {
          throw new Error("User not logged in");
        }

        if (!smartWalletAddress) {
          throw new Error("Smart wallet not available");
        }

        console.log(`Starting execution for pool: ${poolAddress}`);
        console.log("Using smart wallet for execution:", smartWalletAddress);

        // Use the callContractFunction to call beginExecution on the pool contract
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          // We've added beginExecution to the ABI, so we can use StageDotFunPoolABI directly
          StageDotFunPoolABI,
          "beginExecution",
          [], // No parameters for beginExecution
          `Starting execution for pool ${poolAddress}`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to begin execution");
        }

        console.log("Execution started successfully:", result);

        return {
          success: true,
          txHash: result.txHash,
        };
      } catch (error) {
        console.error("Error in beginExecution:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [user, smartWalletAddress, callContractFunction]
  );

  return {
    isLoading,
    beginExecution,
  };
}
