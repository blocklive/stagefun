import { useState } from "react";
import { ethers } from "ethers";
import useSWRMutation from "swr/mutation";
import { useSmartWallet } from "./useSmartWallet";
import showToast from "@/utils/toast";

// Generic ERC20 interface with most common functions
const ERC20_INTERFACE = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

interface SendTokenArgs {
  destinationAddress: string;
  amount: string; // String to avoid JavaScript number precision issues
  asset: {
    name: string;
    symbol: string;
    balance: string;
    address?: string; // Contract address for the token
    isNative?: boolean; // Flag to identify native currency
    decimals?: number; // Optional decimals from the asset object
  };
}

/**
 * Hook for sending tokens using SWR mutation
 * @returns Functions and state for sending tokens
 */
export function useSendToken() {
  const [isSending, setIsSending] = useState(false);
  const { smartWalletAddress, callContractFunction, sendTransaction } =
    useSmartWallet();

  // Define the key for SWR
  const key = "token-transfer";

  // Define the actual transfer function
  const transferToken = async (_: string, { arg }: { arg: SendTokenArgs }) => {
    const { destinationAddress, amount, asset } = arg;

    if (!asset || !smartWalletAddress) {
      throw new Error("No asset or smart wallet available");
    }

    if (!ethers.isAddress(destinationAddress)) {
      throw new Error("Invalid destination address");
    }

    // Basic validation on the amount
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("Please enter a valid amount");
    }

    // Check if amount exceeds balance
    if (parseFloat(amount) > parseFloat(asset.balance)) {
      throw new Error(
        `Insufficient balance. Maximum amount is ${asset.balance} ${asset.symbol}`
      );
    }

    setIsSending(true);
    const loadingToast = showToast.loading("Processing transfer...");

    try {
      // Get the RPC provider
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      // Check if this is the native MON token
      console.log("asset", asset);
      const isNativeMON =
        asset.isNative ||
        (asset.symbol === "MON" && !asset.address) ||
        asset.address === null;

      console.log("Sending asset:", {
        symbol: asset.symbol,
        address: asset.address,
        isNative: isNativeMON,
      });

      if (isNativeMON) {
        // Handle native token transfer
        console.log("Sending native MON token");

        // Parse the amount to wei (MON uses 18 decimals)
        const amountInWei = ethers.parseEther(amount);

        // For native token transfers, we need to use sendTransaction directly
        // instead of callContractFunction with empty parameters
        try {
          // Create a transaction request for sending native MON
          const result = await sendTransaction(
            destinationAddress as `0x${string}`,
            "0x", // Empty data for native token transfer
            `Transferring ${amount} MON to ${destinationAddress}`,
            amountInWei // Pass the value for native token transfer
          );

          if (!result.success) {
            throw new Error(result.error || "Failed to send MON");
          }

          // Handle success
          showToast.success("MON successfully sent!", { id: loadingToast });
          return result;
        } catch (error) {
          console.error("Error sending native MON:", error);
          throw error;
        }
      } else {
        // Handle ERC20 token transfer
        // Get token contract address
        let tokenAddress: string;

        console.log("asset", asset);

        if (!asset.address) {
          throw new Error(`No token address provided for ${asset.symbol}`);
        }

        try {
          // Use ethers.getAddress to convert any casing to proper checksum format
          tokenAddress = ethers.getAddress(asset.address);
          console.log(
            `Using normalized address: ${tokenAddress} for ${asset.symbol}`
          );
        } catch (e) {
          console.error(`Invalid address format: ${asset.address}`);
          throw new Error(`Invalid token address for ${asset.symbol}`);
        }

        // Get token decimals from the asset object directly instead of making a contract call
        // Default to 18 if not available
        let tokenDecimals = 18;

        // Try to get decimals from the asset object if available
        if (asset.decimals !== undefined) {
          tokenDecimals = asset.decimals;
          console.log(`Using decimals from asset: ${tokenDecimals}`);
        }

        let amountInBaseUnits: ethers.BigNumberish;

        try {
          // The component sends properly formatted decimal strings
          amountInBaseUnits = ethers.parseUnits(amount, tokenDecimals);

          console.log("Sending transaction:", {
            token: asset.symbol,
            tokenAddress,
            amount,
            tokenDecimals,
            amountInBaseUnits: amountInBaseUnits.toString(),
          });
        } catch (error: any) {
          console.error("Error converting amount:", error);
          throw new Error(
            `Invalid amount format or too many decimal places for this token (max: ${tokenDecimals}).`
          );
        }

        // Execute the transfer
        const result = await callContractFunction(
          tokenAddress as `0x${string}`,
          ERC20_INTERFACE,
          "transfer",
          [destinationAddress, amountInBaseUnits],
          `Transferring ${amount} ${asset.symbol} to ${destinationAddress}`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to send asset");
        }

        // Handle success
        showToast.success("Asset successfully sent!", { id: loadingToast });
        return result;
      }
    } catch (error) {
      // Handle error
      console.error("Error sending asset:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to send asset",
        { id: loadingToast }
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  // Use SWR mutation
  const { trigger, isMutating, error, data, reset } = useSWRMutation(
    key,
    transferToken,
    {
      throwOnError: false,
      onError: (err) => {
        console.error("SWR mutation error:", err);
      },
    }
  );

  // Wrapper function with more friendly signature
  const sendToken = async (params: SendTokenArgs) => {
    try {
      return await trigger(params);
    } catch (error) {
      // Error is already handled in transferToken
      return null;
    }
  };

  return {
    sendToken,
    isSending: isSending || isMutating,
    error,
    data,
    reset,
  };
}
