import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useBiconomy } from "../contexts/BiconomyContext";
import { usePrivy } from "@privy-io/react-auth";
import {
  getContractAddresses,
  StageDotFunPoolABI,
} from "../lib/contracts/StageDotFunPool";

interface BiconomyContractInteractionHookResult {
  isLoading: boolean;
  error: string | null;
  depositToPool: (contractAddress: string, amount: number) => Promise<any>;
  walletAddress: string | null;
}

export function useBiconomyContractInteraction(): BiconomyContractInteractionHookResult {
  const { user } = usePrivy();
  const {
    smartAccountAddress,
    sendTransaction,
    isLoading: biconomyLoading,
  } = useBiconomy();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deposit to a pool using Biconomy smart account
  const depositToPool = useCallback(
    async (contractAddress: string, amount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Depositing to pool with Biconomy:", {
          contractAddress,
          amount,
        });
        console.log("Smart account address:", smartAccountAddress);

        if (!smartAccountAddress) {
          throw new Error("Smart account not initialized");
        }

        if (!contractAddress || !contractAddress.startsWith("0x")) {
          throw new Error("Invalid contract address");
        }

        // Convert amount to USDC base units (6 decimals)
        const usdcDecimals = 6;
        const amountBigInt = ethers.parseUnits(amount.toString(), usdcDecimals);
        const amountFormatted = ethers.formatUnits(amountBigInt, usdcDecimals);

        console.log("Amount details:", {
          amount,
          amountBigInt: amountBigInt.toString(),
          amountFormatted,
        });

        // Get USDC contract address
        const usdcAddress = getContractAddresses().usdc;
        console.log("USDC contract address:", usdcAddress);

        // First, we need to approve USDC for the pool contract
        // Create contract interface for USDC
        const usdcInterface = new ethers.Interface([
          "function approve(address spender, uint256 value) returns (bool)",
        ]);

        // Encode the approval function call
        const approvalData = usdcInterface.encodeFunctionData("approve", [
          contractAddress,
          amountBigInt,
        ]);

        console.log("Approval transaction data:", {
          to: usdcAddress,
          data: approvalData,
          value: "0",
        });

        // Send the approval transaction
        console.log("Sending USDC approval transaction");
        const approvalTx = await sendTransaction({
          to: usdcAddress,
          data: approvalData,
          value: "0",
        });

        console.log("USDC approval transaction sent:", approvalTx);

        // Now, encode the deposit function call
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const depositData = poolInterface.encodeFunctionData("deposit", [
          amountBigInt,
        ]);

        console.log("Deposit transaction data:", {
          to: contractAddress,
          data: depositData,
          value: "0",
        });

        // Send the deposit transaction
        console.log("Sending deposit transaction");
        const depositTx = await sendTransaction({
          to: contractAddress,
          data: depositData,
          value: "0",
        });

        console.log("Deposit transaction sent:", depositTx);

        return {
          success: true,
          approvalTx,
          depositTx,
        };
      } catch (err: any) {
        console.error("Error in depositToPool:", err);
        setError(err.message || "Failed to deposit to pool");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sendTransaction, smartAccountAddress]
  );

  return {
    isLoading: isLoading || biconomyLoading,
    error,
    depositToPool,
    walletAddress: smartAccountAddress,
  };
}
