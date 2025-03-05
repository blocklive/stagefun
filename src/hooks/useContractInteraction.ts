import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  depositToPoolOnChain,
  createPoolOnChain,
  getPoolFromChain,
  getPoolLpHoldersFromChain,
  getUserPoolBalanceFromChain,
} from "../lib/services/contract-service";
import { ContractPool } from "../lib/contracts/StageDotFunPool";

export function useContractInteraction() {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to get a provider for read operations
  const getProvider = useCallback(async () => {
    if (!walletsReady || !wallets.length) {
      throw new Error("No wallets available - please connect your wallet");
    }

    try {
      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        throw new Error("No embedded wallet found");
      }

      const provider = await embeddedWallet.getEthereumProvider();
      return new ethers.BrowserProvider(provider);
    } catch (error) {
      console.error("Error creating provider:", error);
      throw error;
    }
  }, [walletsReady, wallets]);

  // Function to get a signer for write operations
  const getSigner = useCallback(async () => {
    if (!user) {
      throw new Error("User not logged in");
    }

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      return signer;
    } catch (error) {
      console.error("Error getting signer:", error);
      throw new Error(
        "Failed to initialize wallet signer: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }, [user, getProvider]);

  // Create a pool on the blockchain
  const createPool = async (name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      const { receipt, poolId } = await createPoolOnChain(signer, name);
      return { receipt, poolId };
    } catch (err: any) {
      setError(err.message || "Error creating pool on chain");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Deposit to a pool on the blockchain
  const depositToPool = useCallback(
    async (poolId: string, amount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log(
          "Starting deposit process for pool:",
          poolId,
          "amount:",
          amount
        );

        const signer = await getSigner();
        const signerAddress = await signer.getAddress();
        console.log("Got signer for address:", signerAddress);

        console.log("Proceeding with deposit");
        const receipt = await depositToPoolOnChain(signer, poolId, amount);
        console.log("Deposit successful, receipt:", receipt);
        return receipt;
      } catch (err) {
        console.error("Error in depositToPool:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error depositing to pool on chain";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, getSigner]
  );

  // Get pool data from the blockchain
  const getPool = async (poolId: string): Promise<ContractPool | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getPoolFromChain(provider, poolId);
    } catch (err: any) {
      setError(err.message || "Error getting pool from chain");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get pool LP token holders from the blockchain
  const getPoolLpHolders = async (poolId: string): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getPoolLpHoldersFromChain(provider, poolId);
    } catch (err: any) {
      setError(err.message || "Error getting pool LP holders from chain");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get user's LP token balance for a pool
  const getUserPoolBalance = async (
    userAddress: string,
    poolId: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getUserPoolBalanceFromChain(provider, userAddress, poolId);
    } catch (err: any) {
      setError(err.message || "Error getting user pool balance from chain");
      return "0";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createPool,
    depositToPool,
    getPool,
    getPoolLpHolders,
    getUserPoolBalance,
    walletAddress: user?.wallet?.address || null,
    walletsReady: privyReady && walletsReady && !!user?.wallet,
    privyReady,
  };
}
