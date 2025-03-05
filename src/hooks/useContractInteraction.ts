import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  commitToPoolOnChain,
  createPoolOnChain,
  getPoolFromChain,
  getPoolCommitmentsFromChain,
  getUserCommitmentFromChain,
  getUSDCBalance,
} from "../lib/services/contract-service";
import {
  ContractPool,
  ContractCommitment,
} from "../lib/contracts/PoolCommitment";

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
  const createPool = async (poolId: string, targetAmount: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      const receipt = await createPoolOnChain(signer, poolId, targetAmount);
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error creating pool on chain");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Commit to a pool on the blockchain
  const commitToPool = useCallback(
    async (poolId: string, amount: number, contractAddress: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log(
          "Starting commit process for pool:",
          poolId,
          "amount:",
          amount
        );

        const signer = await getSigner();
        const signerAddress = await signer.getAddress();
        console.log("Got signer for address:", signerAddress);

        console.log("Proceeding with commit");
        const receipt = await commitToPoolOnChain(
          signer,
          poolId,
          amount,
          contractAddress
        );
        console.log("Commit successful, receipt:", receipt);
        return receipt;
      } catch (err) {
        console.error("Error in commitToPool:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error committing to pool on chain";
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

  // Get pool commitments from the blockchain
  const getPoolCommitments = async (
    poolId: string
  ): Promise<ContractCommitment[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getPoolCommitmentsFromChain(provider, poolId);
    } catch (err: any) {
      setError(err.message || "Error getting pool commitments from chain");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get user commitment from the blockchain
  const getUserCommitment = async (
    userAddress: string,
    poolId: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getUserCommitmentFromChain(provider, userAddress, poolId);
    } catch (err: any) {
      setError(err.message || "Error getting user commitment from chain");
      return "0";
    } finally {
      setIsLoading(false);
    }
  };

  // Get USDC balance
  const getBalance = useCallback(
    async (userAddress: string): Promise<string> => {
      if (!user || !userAddress) {
        console.log(
          "Skipping balance check - user not logged in or no address"
        );
        return "0";
      }

      try {
        console.log("Getting balance for address:", userAddress);
        const provider = await getProvider();
        const balance = await getUSDCBalance(provider, userAddress);
        console.log("Retrieved balance:", balance);
        return balance;
      } catch (error) {
        console.error("Error getting balance:", error);
        return "0";
      }
    },
    [user, getProvider]
  );

  return {
    isLoading,
    error,
    createPool,
    commitToPool,
    getPool,
    getPoolCommitments,
    getUserCommitment,
    getBalance,
    walletAddress: user?.wallet?.address || null,
    walletsReady: privyReady && walletsReady && !!user?.wallet,
    privyReady,
  };
}
