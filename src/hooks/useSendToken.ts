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
  };
}

/**
 * Hook for sending tokens using SWR mutation
 * @returns Functions and state for sending tokens
 */
export function useSendToken() {
  const [isSending, setIsSending] = useState(false);
  const { smartWalletAddress, callContractFunction } = useSmartWallet();

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

      // Get token contract address - this varies by asset
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

      // Create a contract instance for the specific token
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_INTERFACE,
        provider
      );

      // Dynamically get token decimals from the contract
      let tokenDecimals = 0;
      try {
        // Call the decimals() function on the contract
        const decimalsResult = await tokenContract.decimals();
        tokenDecimals = Number(decimalsResult);
        console.log(`Retrieved token decimals from contract: ${tokenDecimals}`);
      } catch (error) {
        console.warn(
          "Failed to get decimals from contract, defaulting to 18:",
          error
        );
        tokenDecimals = 18; // Default to 18 if we can't get decimals (most ERC20 tokens use 18)
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
