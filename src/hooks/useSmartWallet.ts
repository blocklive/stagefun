import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";

export function useSmartWallet() {
  const { user, ready } = usePrivy();
  const { client } = useSmartWallets();
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const logSmartWallet = async () => {
      if (!ready || !user) {
        return;
      }

      try {
        const smartWalletAccount = user.linkedAccounts.find(
          (account) => account.type === "smart_wallet"
        );

        if (smartWalletAccount) {
          setSmartWalletAddress(smartWalletAccount.address);
        } else {
          console.log("No smart wallet found for user");
          setSmartWalletAddress(null);
        }
      } catch (err) {
        console.error("Error getting smart wallet:", err);
      }
    };

    logSmartWallet();
  }, [ready, user]);

  const sendTransaction = async (
    contractAddress: `0x${string}`,
    data: `0x${string}`,
    description: string = "Send Transaction"
  ) => {
    if (!client) {
      console.error("Smart wallet client not available");
      return { success: false, error: "Smart wallet client not available" };
    }

    setIsLoading(true);
    try {
      const uiOptions = {
        description: description,
        buttonText: "Send Transaction",
        transactionInfo: {
          title: "Smart Wallet Transaction",
          action: description,
        },
      };

      const txRequest = {
        to: contractAddress,
        data,
        value: BigInt(0),
      };

      console.log("Sending transaction with smart wallet:", txRequest);
      const txHash = await client.sendTransaction(txRequest, { uiOptions });
      console.log("Transaction sent successfully:", txHash);

      return { success: true, txHash };
    } catch (error) {
      console.error("Error sending transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
      };
    } finally {
      setIsLoading(false);
    }
  };

  // This function allows calling arbitrary contract functions with parameters
  const callContractFunction = async (
    contractAddress: `0x${string}`,
    abi: any,
    functionName: string,
    args: any[],
    description: string = `Call ${functionName}`,
    options: { value?: string | bigint } = {}
  ) => {
    if (!client) {
      console.error("Smart wallet client not available");
      return { success: false, error: "Smart wallet client not available" };
    }

    setIsLoading(true);
    try {
      // Create function interface
      const iface = new ethers.Interface(abi);
      // Encode function data
      const data = iface.encodeFunctionData(
        functionName,
        args
      ) as `0x${string}`;

      const uiOptions = {
        description,
        buttonText: "Confirm Transaction",
        transactionInfo: {
          title: description,
          action: functionName,
        },
      };

      const txRequest = {
        to: contractAddress,
        data,
        value: options.value ? BigInt(options.value) : BigInt(0),
      };

      console.log(`Calling ${functionName} with smart wallet:`, {
        to: contractAddress,
        functionName,
        args,
        value: options.value ? BigInt(options.value).toString() : "0",
      });

      const txHash = await client.sendTransaction(txRequest, { uiOptions });
      console.log(`${functionName} transaction sent successfully:`, txHash);

      return { success: true, txHash };
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    smartWalletAddress,
    isLoading,
    sendTransaction,
    callContractFunction,
  };
}
