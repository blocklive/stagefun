"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ChainId } from "@biconomy/core-types";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
  createSmartAccountClient,
} from "@biconomy/account";
import { PaymasterMode } from "@biconomy/paymaster";

// Use environment variables for Biconomy API keys
const BUNDLER_URL = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;
const PAYMASTER_URL = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143");

// Define the context type
interface BiconomyContextType {
  smartAccount: BiconomySmartAccountV2 | null;
  smartAccountAddress: string | null;
  isLoading: boolean;
  error: string | null;
  sendTransaction: (transaction: {
    to: string;
    data?: string;
    value?: string | number;
  }) => Promise<any>;
}

// Create the context
const BiconomyContext = createContext<BiconomyContextType>({
  smartAccount: null,
  smartAccountAddress: null,
  isLoading: false,
  error: null,
  sendTransaction: async () => {
    throw new Error("BiconomyContext not initialized");
  },
});

// Provider component
export const BiconomyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize smart account when user and wallets are ready
  useEffect(() => {
    const initSmartAccount = async () => {
      if (
        !privyReady ||
        !walletsReady ||
        !user ||
        wallets.length === 0 ||
        !BUNDLER_URL ||
        !PAYMASTER_URL
      ) {
        if (!BUNDLER_URL || !PAYMASTER_URL) {
          console.error("Biconomy API keys not found in environment variables");
          setError("Biconomy API keys not configured");
        }
        return;
      }

      console.log("Starting Biconomy smart account initialization");
      console.log("Environment variables:", {
        bundlerUrl: BUNDLER_URL,
        paymasterUrl: PAYMASTER_URL,
        chainId: CHAIN_ID,
      });

      setIsLoading(true);
      setError(null);

      try {
        // Find the embedded wallet
        const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
        );

        if (!embeddedWallet) {
          throw new Error("No embedded wallet found");
        }

        console.log("Found embedded wallet:", embeddedWallet.address);

        // Get the Ethereum provider from the embedded wallet
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();

        console.log("Got signer:", await signer.getAddress());
        console.log("Initializing Biconomy smart account with:", {
          bundlerUrl: BUNDLER_URL,
          paymasterUrl: PAYMASTER_URL,
          chainId: CHAIN_ID,
        });

        // Create the smart account
        const smartAccountClient = await createSmartAccountClient({
          signer,
          bundlerUrl: BUNDLER_URL,
          paymasterUrl: PAYMASTER_URL,
          chainId: CHAIN_ID as ChainId, // Monad Testnet
          entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        });

        // Get the smart account address
        const address = await smartAccountClient.getAccountAddress();
        const isDeployed = await smartAccountClient.isAccountDeployed();

        console.log("Smart Account created:", {
          address,
          isDeployed,
        });

        setSmartAccount(smartAccountClient);
        setSmartAccountAddress(address);
      } catch (err: any) {
        console.error("Error initializing smart account:", err);
        setError(err.message || "Failed to initialize smart account");
      } finally {
        setIsLoading(false);
      }
    };

    initSmartAccount();
  }, [privyReady, walletsReady, user, wallets]);

  // Function to send a transaction using the smart account
  const sendTransaction = async (transaction: {
    to: string;
    data?: string;
    value?: string | number;
  }) => {
    if (!smartAccount) {
      throw new Error("Smart account not initialized");
    }

    try {
      setIsLoading(true);

      // Convert value to string if it's a number
      const value =
        typeof transaction.value === "number"
          ? transaction.value.toString()
          : transaction.value || "0";

      // Prepare the transaction
      const tx = {
        to: transaction.to,
        data: transaction.data || "0x",
        value: value,
      };

      console.log("Sending transaction:", tx);

      // Send the transaction with gas sponsorship
      const userOpResponse = await smartAccount.sendTransaction(tx, {
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
        },
      });

      console.log("UserOp Hash:", userOpResponse.userOpHash);

      // Wait for the transaction to be mined
      const transactionDetails = await userOpResponse.wait();

      console.log("Transaction completed:", transactionDetails);

      return {
        userOpHash: userOpResponse.userOpHash,
        transactionHash: transactionDetails.receipt.transactionHash,
        receipt: transactionDetails.receipt,
      };
    } catch (err: any) {
      console.error("Error sending transaction:", err);
      throw new Error(err.message || "Failed to send transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BiconomyContext.Provider
      value={{
        smartAccount,
        smartAccountAddress,
        isLoading,
        error,
        sendTransaction,
      }}
    >
      {children}
    </BiconomyContext.Provider>
  );
};

// Hook to use the context
export function useBiconomy() {
  const context = useContext(BiconomyContext);
  if (context === undefined) {
    throw new Error("useBiconomy must be used within a BiconomyProvider");
  }
  return context;
}
