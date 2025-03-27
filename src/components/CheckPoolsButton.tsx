"use client";

import { useState } from "react";
import { FaSync } from "react-icons/fa";
import { ethers } from "ethers";
import { useSmartWallet } from "../hooks/useSmartWallet";
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";
import { StageDotFunPoolFactoryABI } from "../lib/contracts/StageDotFunPool";

export function CheckPoolsButton() {
  const { smartWalletAddress, isLoading, sendTransaction } = useSmartWallet();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const checkAllPoolsStatus = async () => {
    setTxHash(null);
    setError(null);
    setIsSuccess(false);

    try {
      // Get the factory address from our constants
      const factoryAddress =
        CONTRACT_ADDRESSES.monadTestnet.stageDotFunPoolFactory;

      if (!factoryAddress || !factoryAddress.startsWith("0x")) {
        throw new Error("Invalid factory address");
      }

      // Create the transaction data for calling checkAllPoolsStatus
      const factoryInterface = new ethers.Interface(StageDotFunPoolFactoryABI);
      const data = factoryInterface.encodeFunctionData(
        "checkAllPoolsStatus",
        []
      ) as `0x${string}`;

      console.log("Calling checkAllPoolsStatus on factory:", factoryAddress);
      console.log("Using smart wallet:", smartWalletAddress);

      const result = await sendTransaction(
        factoryAddress as `0x${string}`,
        data,
        "Check status of all pools"
      );

      if (result.success && result.txHash) {
        console.log("Transaction successful:", result.txHash);
        setTxHash(typeof result.txHash === "string" ? result.txHash : null);
        setIsSuccess(true);
      } else {
        console.error("Transaction failed:", result.error);
        setError(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Error checking pool statuses:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={checkAllPoolsStatus}
        disabled={isLoading || !smartWalletAddress}
        className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white ${
          isLoading || !smartWalletAddress
            ? "bg-purple-300 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-700"
        } transition-colors`}
      >
        {isLoading ? (
          <>
            <FaSync className="animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <FaSync className="mr-2" />
            Check All Pools Status
          </>
        )}
      </button>

      {isSuccess && txHash && (
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
          <p className="font-medium">Transaction successful!</p>
          <p className="text-sm mt-1 break-all">Transaction Hash: {txHash}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          <p className="font-medium">Transaction failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
