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
    if (!privyReady) {
      console.log("Privy not ready yet:", { privyReady });
      throw new Error("Privy not initialized");
    }

    // For read operations, we can use a direct RPC provider
    console.log("Creating provider for Monad testnet");
    const provider = new ethers.JsonRpcProvider(
      "https://testnet-rpc.monad.xyz"
    );
    console.log("Provider created successfully");
    return provider;
  }, [privyReady]);

  // Function to get a signer for write operations
  const getSigner = async () => {
    if (!privyReady || !walletsReady) {
      console.log("Privy or wallets not ready yet:", {
        privyReady,
        walletsReady,
      });
      throw new Error("Wallet not initialized");
    }

    console.log("Getting signer with wallets:", wallets.length);

    // Find the embedded wallet
    const embeddedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );

    if (!embeddedWallet) {
      console.error(
        "No embedded wallet found in wallets:",
        wallets.map((w) => ({ type: w.walletClientType, address: w.address }))
      );
      throw new Error("No embedded wallet found");
    }

    console.log("Found embedded wallet for signing:", embeddedWallet.address);
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
  const getBalance = useCallback(
    async (userAddress: string): Promise<string> => {
      if (!privyReady) {
        console.log("Skipping balance check - Privy not ready:", {
          privyReady,
        });
        return "0";
      }

      if (!user) {
        console.log("Skipping balance check - user not logged in");
        return "0";
      }

      try {
        console.log(
          "useContractInteraction: Getting balance for address:",
          userAddress
        );
        const provider = await getProvider();
        const balance = await getUSDCBalance(provider, userAddress);
        console.log("useContractInteraction: Retrieved balance:", balance);
        return balance;
      } catch (err: any) {
        console.error("useContractInteraction: Error getting balance:", err);
        return "0";
      }
    },
    [privyReady, user, getProvider]
  );

  // Get the current wallet address - only if everything is ready
  const walletAddress =
    privyReady && walletsReady
      ? wallets.find((wallet) => wallet.walletClientType === "privy")
          ?.address || null
      : null;

  return {
    isLoading,
    error,
    createPool,
    commitToPool,
    getPool,
    getPoolCommitments,
    getUserCommitment,
    getBalance,
    walletAddress,
  };
}
