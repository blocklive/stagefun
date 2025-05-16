import { useCallback, useState } from "react";
import { useSmartWallet } from "./useSmartWallet";
import showToast from "@/utils/toast";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Create a detailed WMON contract interface exactly matching the contract
const WMON_ABI = [
  // Basic ERC20 functions
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  // WMON specific functions
  "function deposit() payable",
  "function withdraw(uint256)",
];

// Get the WMON address from the contracts file
const WMON_ADDRESS = CONTRACT_ADDRESSES.monadTestnet.officialWmon;

interface WrapUnwrapResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

export function useWrapUnwrap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { callContractFunction, smartWalletAddress } = useSmartWallet();

  // Wrap MON to WMON
  const wrapMon = useCallback(
    async (amountWei: string): Promise<WrapUnwrapResult> => {
      if (!callContractFunction || !smartWalletAddress) {
        return {
          success: false,
          error: "Smart wallet functions not available",
        };
      }

      setIsLoading(true);
      setError(null);

      // Create a loading toast
      const loadingToast = showToast.loading("Swap in progress...");

      try {
        const amountBigInt = BigInt(amountWei);
        console.log(
          `Wrapping ${amountBigInt.toString()} MON to WMON with detailed contract interface`
        );
        console.log(`WMON address: ${WMON_ADDRESS}`);

        // Call deposit with MON value
        const result = await callContractFunction(
          WMON_ADDRESS as `0x${string}`,
          WMON_ABI,
          "deposit",
          [], // no arguments needed
          "Wrap MON to WMON",
          { value: amountBigInt } // Send the MON as value
        );

        console.log("MON to WMON wrap result:", result);

        if (result.success) {
          showToast.success("Swap complete", { id: loadingToast });
        } else {
          showToast.error(result.error || "Swap failed", { id: loadingToast });
        }

        return result;
      } catch (wrapError) {
        console.error("Error in MON wrapping:", wrapError);

        const errorMessage =
          wrapError instanceof Error
            ? wrapError.message
            : "Unknown error during wrapping";

        setError(errorMessage);
        showToast.error("Swap failed: " + errorMessage, { id: loadingToast });

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [callContractFunction, smartWalletAddress]
  );

  // Unwrap WMON to MON
  const unwrapWmon = useCallback(
    async (
      amountWei: string,
      wmonBalanceWei: string
    ): Promise<WrapUnwrapResult> => {
      if (!callContractFunction || !smartWalletAddress) {
        return {
          success: false,
          error: "Smart wallet functions not available",
        };
      }

      setIsLoading(true);
      setError(null);

      // Create a loading toast
      const loadingToast = showToast.loading("Swap in progress...");

      try {
        // Convert the balance to numbers for comparison
        const wmonBalance = parseFloat(wmonBalanceWei);
        const requestedAmount = parseFloat(amountWei);

        console.log("WMON balance:", wmonBalance);
        console.log("Requested amount:", requestedAmount);
        // Check if the user has enough WMON
        if (wmonBalance < requestedAmount) {
          const errorMessage = `Insufficient WMON balance. You have ${wmonBalanceWei} WMON but are trying to unwrap ${amountWei} WMON.`;

          console.log("WMON unwrap failed due to insufficient balance:", {
            success: false,
            error: errorMessage,
          });

          showToast.error("Swap failed: " + errorMessage, { id: loadingToast });

          return {
            success: false,
            error: errorMessage,
          };
        }

        // Using ethers.js to format the number correctly
        const amountBigInt = BigInt(amountWei);

        console.log(
          `Unwrapping ${amountBigInt.toString()} WMON to MON with detailed contract interface`
        );
        console.log(`WMON address: ${WMON_ADDRESS}`);

        // Call withdraw with the exact parameter type from the contract
        const result = await callContractFunction(
          WMON_ADDRESS as `0x${string}`,
          WMON_ABI,
          "withdraw",
          [amountBigInt],
          "Unwrap WMON to MON"
        );

        console.log("WMON to MON unwrap result:", result);

        if (result.success) {
          showToast.success("Swap complete", { id: loadingToast });
        } else {
          showToast.error(result.error || "Swap failed", { id: loadingToast });
        }

        return result;
      } catch (unwrapError) {
        console.error("Error in WMON unwrapping:", unwrapError);

        const errorMessage =
          unwrapError instanceof Error
            ? unwrapError.message
            : "Unknown error during unwrapping";

        setError(errorMessage);
        showToast.error("Swap failed: " + errorMessage, { id: loadingToast });

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [callContractFunction, smartWalletAddress]
  );

  return {
    wrapMon,
    unwrapWmon,
    isLoading,
    error,
  };
}
