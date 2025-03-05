import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import type {
  UnsignedTransactionRequest,
  SendTransactionModalUIOptions,
} from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  depositToPoolOnChain,
  createPoolOnChain,
  getPoolFromChain,
  getPoolLpHoldersFromChain,
  getUserPoolBalanceFromChain,
  getUSDCBalance,
} from "../lib/services/contract-service";
import { ContractPool } from "../lib/contracts/StageDotFunPool";
import {
  getUSDCContract,
  formatToken,
  getPoolId,
  CONTRACT_ADDRESSES,
  StageDotFunPoolABI,
} from "../lib/contracts/StageDotFunPool";
import { supabase } from "../lib/supabase";

interface ContractInteractionHookResult {
  isLoading: boolean;
  error: string | null;
  createPool: (name: string, ticker: string) => Promise<any>;
  depositToPool: (poolId: string, amount: number) => Promise<any>;
  getPool: (poolId: string) => Promise<ContractPool | null>;
  getPoolLpHolders: (poolId: string) => Promise<string[]>;
  getUserPoolBalance: (userAddress: string, poolId: string) => Promise<string>;
  getBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
  walletsReady: boolean;
  privyReady: boolean;
}

export function useContractInteraction(): ContractInteractionHookResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { sendTransaction } = useSendTransaction();
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
  const createPool = async (name: string, ticker: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      const { receipt, poolId } = await createPoolOnChain(signer, name, ticker);
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

        // Get the embedded wallet
        const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
        );

        if (!embeddedWallet) {
          throw new Error("No embedded wallet found");
        }

        // Get the provider and create contract instances
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const usdcContract = getUSDCContract(ethersProvider);
        const usdcSymbol = await usdcContract.symbol();
        const usdcDecimals = await usdcContract.decimals();
        const amountBigInt = ethers.parseUnits(amount.toString(), usdcDecimals);
        const amountFormatted = ethers.formatUnits(amountBigInt, usdcDecimals);

        // Get the pool name from the database
        const { data: pool } = await supabase
          .from("pools")
          .select("name")
          .eq("id", poolId)
          .single();

        if (!pool) {
          throw new Error("Pool not found");
        }

        // Generate the correct pool ID from the pool name
        const bytes32PoolId = getPoolId(pool.name);

        // Check allowance
        const currentAllowance = await usdcContract.allowance(
          signerAddress,
          CONTRACT_ADDRESSES.stageDotFunPool
        );

        // Handle approval if needed
        if (currentAllowance < amountBigInt) {
          // Create contract interface for USDC
          const usdcInterface = new ethers.Interface([
            "function approve(address spender, uint256 value) returns (bool)",
          ]);

          const approvalData = usdcInterface.encodeFunctionData("approve", [
            CONTRACT_ADDRESSES.stageDotFunPool,
            amountBigInt,
          ]);

          // Prepare the approval transaction request
          const approvalRequest = {
            to: CONTRACT_ADDRESSES.usdc,
            data: approvalData,
            value: "0",
            from: signerAddress,
            chainId: 10143, // Monad Testnet
          };

          // Set UI options for the approval transaction
          const approvalUiOptions: SendTransactionModalUIOptions = {
            description: `Approving ${amountFormatted} ${usdcSymbol} for deposit`,
            buttonText: "Approve USDC",
            transactionInfo: {
              title: "USDC Approval",
              action: "Approve USDC",
              contractInfo: {
                name: "USDC Token",
              },
            },
          };

          console.log("Sending approval transaction");
          await sendTransaction(approvalRequest, {
            uiOptions: approvalUiOptions,
          });
          console.log("Approval transaction confirmed");
        }

        // Create contract interface for pool deposit
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const depositData = poolInterface.encodeFunctionData("deposit", [
          bytes32PoolId,
          amountBigInt,
        ]);

        // Prepare the deposit transaction request
        const depositRequest = {
          to: CONTRACT_ADDRESSES.stageDotFunPool,
          data: depositData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
        };

        // Set UI options for the deposit transaction
        const depositUiOptions: SendTransactionModalUIOptions = {
          description: `Depositing ${amountFormatted} ${usdcSymbol} to the pool`,
          buttonText: "Confirm Deposit",
          transactionInfo: {
            title: "Pool Deposit",
            action: "Deposit USDC",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending deposit transaction");
        const receipt = await sendTransaction(depositRequest, {
          uiOptions: depositUiOptions,
        });
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
    [user, getSigner, wallets, sendTransaction]
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

  // Get user's USDC balance
  const getBalance = async (userAddress: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      if (!rpcUrl) {
        throw new Error("RPC URL not configured");
      }

      // Create a direct RPC provider instead of using the embedded wallet
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const usdcContract = getUSDCContract(provider);
      const balance = await usdcContract.balanceOf(userAddress);
      return formatToken(balance);
    } catch (err: any) {
      console.error("Error getting USDC balance:", err);
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
    depositToPool,
    getPool,
    getPoolLpHolders,
    getUserPoolBalance,
    getBalance,
    walletAddress: user?.wallet?.address || null,
    walletsReady: privyReady && walletsReady && !!user?.wallet,
    privyReady,
  };
}
