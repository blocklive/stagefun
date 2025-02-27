import { useState } from "react";
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
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the embedded wallet from Privy
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // Function to get a provider for read operations
  const getProvider = async () => {
    if (!embeddedWallet) {
      throw new Error("No embedded wallet found");
    }

    return new ethers.BrowserProvider(
      await embeddedWallet.getEthereumProvider()
    );
  };

  // Function to get a signer for write operations
  const getSigner = async () => {
    if (!embeddedWallet) {
      throw new Error("No embedded wallet found");
    }

    const provider = new ethers.BrowserProvider(
      await embeddedWallet.getEthereumProvider()
    );
    return await provider.getSigner();
  };

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
  const commitToPool = async (poolId: string, amount: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      const receipt = await commitToPoolOnChain(signer, poolId, amount);
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error committing to pool on chain");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

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
  const getBalance = async (userAddress: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getProvider();
      return await getUSDCBalance(provider, userAddress);
    } catch (err: any) {
      setError(err.message || "Error getting USDC balance");
      return "0";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createPool,
    commitToPool,
    getPool,
    getPoolCommitments,
    getUserCommitment,
    getBalance,
    walletAddress: embeddedWallet?.address || null,
  };
}
