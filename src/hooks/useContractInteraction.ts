import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import type { SendTransactionModalUIOptions } from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  getPoolLpHoldersFromChain,
  getUserPoolBalanceFromChain,
} from "../lib/services/contract-service";
import { ContractPool } from "../lib/contracts/StageDotFunPool";
import {
  getUSDCContract,
  formatToken,
  getContractAddresses,
  StageDotFunPoolABI,
  getPoolByName,
  getPoolContract,
} from "../lib/contracts/StageDotFunPool";
import {
  getRecommendedGasParams,
  getRecommendedGasParamsAsStrings,
} from "../lib/contracts/gas-utils";

interface ContractInteractionHookResult {
  isLoading: boolean;
  error: string | null;
  withdrawFromPool: (
    poolAddress: string,
    amount: number,
    destinationAddress: string
  ) => Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
  updatePoolName: (
    poolAddress: string,
    newName: string
  ) => Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
  updateMinCommitment: (
    poolAddress: string,
    newMinCommitment: number
  ) => Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
  getPool: (poolId: string) => Promise<ContractPool | null>;
  getPoolLpHolders: (poolId: string) => Promise<string[]>;
  getUserPoolBalance: (userAddress: string, poolId: string) => Promise<string>;
  getBalance: (userAddress: string) => Promise<string>;
  getNativeBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
  walletsReady: boolean;
  privyReady: boolean;
  getProvider: () => Promise<ethers.Provider>;
  distributeRevenue: (
    poolAddress: string,
    amount: number // This parameter is kept for interface consistency but not used
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function useContractInteraction(): ContractInteractionHookResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Function to get a provider for read operations
  const getProvider = useCallback(async () => {
    if (!walletsReady || !wallets.length) {
      throw new Error("No wallets available - please connect your wallet");
    }

    try {
      console.log(
        "Available wallets:",
        wallets.map((w) => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId,
        }))
      );

      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        console.error(
          "No embedded wallet found. Available wallets:",
          wallets.map((w) => w.walletClientType)
        );
        throw new Error(
          "No embedded wallet found. Please try logging out and logging in again."
        );
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

  // Helper function to transfer funds to destination address
  const transferFundsToDestination = useCallback(
    async (
      poolAddress: string,
      destinationAddress: string,
      amount: bigint,
      tokenAddress: string,
      tokenType: string,
      tokenId: string
    ) => {
      try {
        const signer = await getSigner();
        const pool = getPoolContract(signer, poolAddress);
        const tx = await pool.transferFundsToDestination(
          destinationAddress,
          amount,
          tokenAddress,
          tokenType,
          tokenId,
          {
            ...getRecommendedGasParams(),
          }
        );
        await tx.wait();
        return true;
      } catch (error) {
        console.error("Error in transferFundsToDestination:", error);
        throw error;
      }
    },
    [getSigner]
  );

  // Withdraw from a pool on the blockchain
  const withdrawFromPool = useCallback(
    async (
      poolAddress: string,
      amount: number,
      destinationAddress: string
    ): Promise<{
      success: boolean;
      txHash?: string;
      error?: string;
    }> => {
      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log(
          `Starting withdrawal process for pool: ${poolAddress}, amount: ${amount}, destination: ${destinationAddress}`
        );

        const signer = await getSigner();
        const signerAddress = await signer.getAddress();
        console.log("Got signer for address:", signerAddress);

        // Get the embedded wallet
        const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
        );

        if (!embeddedWallet) {
          throw new Error("No embedded wallet found for withdrawal");
        }

        // Get the provider and create contract instances
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);

        // Get the pool contract
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Get pool details and verify status
        const poolDetails = await poolContract.getPoolDetails();
        console.log("Pool details for withdrawal:", {
          name: poolDetails._name,
          creator: poolDetails._creator,
          totalDeposits: poolDetails._totalDeposits.toString(),
          revenueAccumulated: poolDetails._revenueAccumulated.toString(),
          status: poolDetails._status,
        });

        // Check if the pool has reached its target (FUNDED status)
        if (Number(poolDetails._status) !== 4) {
          // 4 is FUNDED status
          throw new Error("Pool must be in FUNDED status to withdraw funds");
        }

        // Calculate the total available funds
        const totalDeposits = ethers.formatUnits(poolDetails._totalDeposits, 6);
        const revenueAccumulated = ethers.formatUnits(
          poolDetails._revenueAccumulated,
          6
        );
        const totalAvailable =
          parseFloat(totalDeposits) + parseFloat(revenueAccumulated);

        // Check if the requested amount is available
        if (amount > totalAvailable) {
          throw new Error(
            `Requested amount (${amount}) exceeds available funds (${totalAvailable})`
          );
        }

        // Convert amount to wei
        const usdcDecimals = 6;
        const amountInWei = ethers.parseUnits(amount.toString(), usdcDecimals);

        // Call withdrawFunds function
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const withdrawData = poolInterface.encodeFunctionData("withdrawFunds", [
          amountInWei,
        ]);

        // Prepare the transaction request
        const withdrawRequest = {
          to: poolAddress,
          data: withdrawData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
          ...getRecommendedGasParamsAsStrings(),
        };

        const withdrawUiOptions = {
          description: `Withdrawing funds from pool`,
          buttonText: "Withdraw Funds",
          transactionInfo: {
            title: "Withdraw Funds",
            action: "Withdraw from Pool",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending withdraw transaction");
        const withdrawTx = await sendTransaction(withdrawRequest, {
          uiOptions: withdrawUiOptions,
        });

        // Wait for transaction to be mined
        const withdrawReceipt = await ethersProvider.waitForTransaction(
          withdrawTx.hash as string
        );

        if (!withdrawReceipt?.status) {
          throw new Error("Failed to withdraw funds from pool");
        }

        // If the destination address is different from the owner, transfer the funds
        if (destinationAddress.toLowerCase() !== signerAddress.toLowerCase()) {
          const result = await transferFundsToDestination(
            poolAddress,
            destinationAddress,
            amountInWei,
            getContractAddresses().usdc,
            "USDC",
            "0"
          );
          if (!result) {
            throw new Error("Failed to transfer funds to destination");
          }
          return {
            success: true,
            txHash: withdrawTx.hash as string,
          };
        }

        console.log("Successfully withdrew funds from pool");
        return {
          success: true,
          txHash: withdrawTx.hash as string,
        };
      } catch (error) {
        console.error("Error in withdrawFromPool:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    [user, getSigner, wallets, sendTransaction, transferFundsToDestination]
  );

  // Update pool name
  const updatePoolName = useCallback(
    async (
      poolAddress: string,
      newName: string
    ): Promise<{
      success: boolean;
      txHash?: string;
      error?: string;
    }> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!walletsReady || !wallets.length) {
          throw new Error("No wallets available - please connect your wallet");
        }

        const ethersProvider = await getProvider();
        const signer = await ethersProvider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("Updating pool name:", {
          poolAddress,
          newName,
          signerAddress,
        });

        // Create contract interface for the pool
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Encode the function call
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const updateNameData = poolInterface.encodeFunctionData(
          "updatePoolName",
          [newName]
        );

        // Prepare the transaction request
        const updateNameRequest = {
          to: poolAddress,
          data: updateNameData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
          ...getRecommendedGasParamsAsStrings(),
        };

        // Set UI options for the transaction
        const updateNameUiOptions: SendTransactionModalUIOptions = {
          description: `Updating pool name to "${newName}"`,
          buttonText: "Update Name",
          transactionInfo: {
            title: "Update Pool Name",
            action: "Update Name",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending update name transaction");
        const txHash = await sendTransaction(updateNameRequest, {
          uiOptions: updateNameUiOptions,
        });

        // Wait for transaction to be mined
        const receipt = await ethersProvider.waitForTransaction(
          txHash.hash as string
        );

        console.log("Pool name updated successfully:", {
          txHash: txHash.hash as string,
          receipt,
        });

        setIsLoading(false);
        return {
          success: true,
          txHash: txHash.hash as string,
        };
      } catch (error) {
        console.error("Error updating pool name:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [walletsReady, wallets, getProvider, sendTransaction]
  );

  // Update minimum commitment
  const updateMinCommitment = useCallback(
    async (
      poolAddress: string,
      newMinCommitment: number
    ): Promise<{
      success: boolean;
      txHash?: string;
      error?: string;
    }> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!walletsReady || !wallets.length) {
          throw new Error("No wallets available - please connect your wallet");
        }

        const ethersProvider = await getProvider();
        const signer = await ethersProvider.getSigner();
        const signerAddress = await signer.getAddress();

        // Convert the min commitment to the correct format (USDC has 6 decimals)
        const minCommitmentBigInt = ethers.parseUnits(
          newMinCommitment.toString(),
          6
        );

        console.log("Updating min commitment:", {
          poolAddress,
          newMinCommitment,
          minCommitmentBigInt: minCommitmentBigInt.toString(),
          signerAddress,
        });

        // Create contract interface for the pool
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Encode the function call
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const updateMinCommitmentData = poolInterface.encodeFunctionData(
          "updateMinCommitment",
          [minCommitmentBigInt]
        );

        // Prepare the transaction request
        const updateMinCommitmentRequest = {
          to: poolAddress,
          data: updateMinCommitmentData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
          ...getRecommendedGasParamsAsStrings(),
        };

        // Set UI options for the transaction
        const updateMinCommitmentUiOptions: SendTransactionModalUIOptions = {
          description: `Updating minimum commitment to ${newMinCommitment} USDC`,
          buttonText: "Update Min Commitment",
          transactionInfo: {
            title: "Update Min Commitment",
            action: "Update Min Commitment",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending update min commitment transaction");
        const txHash = await sendTransaction(updateMinCommitmentRequest, {
          uiOptions: updateMinCommitmentUiOptions,
        });

        // Wait for transaction to be mined
        const receipt = await ethersProvider.waitForTransaction(
          txHash.hash as string
        );

        console.log("Min commitment updated successfully:", {
          txHash: txHash.hash as string,
          receipt,
        });

        setIsLoading(false);
        return {
          success: true,
          txHash: txHash.hash as string,
        };
      } catch (error) {
        console.error("Error updating min commitment:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [walletsReady, wallets, getProvider, sendTransaction]
  );

  // Get pool data from the blockchain
  const getPool = useCallback(
    async (poolId: string): Promise<ContractPool | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const provider = await getProvider();
        const poolAddress = await getPoolByName(provider, poolId);

        if (!poolAddress) {
          return null;
        }

        const poolContract = getPoolContract(provider, poolAddress);
        const details = await poolContract.getPoolDetails();

        // Add detailed logging for pool status
        console.log("Pool status from chain:", {
          poolId,
          rawStatus: details._status,
          isActive: details._status === 1,
          poolDetails: details,
        });

        const pool: ContractPool = {
          name: details._name,
          uniqueId: details._uniqueId || "",
          creator: details._creator || ethers.ZeroAddress,
          totalDeposits: details._totalDeposits,
          revenueAccumulated: details._revenueAccumulated,
          endTime: details._endTime,
          targetAmount: details._targetAmount,
          capAmount: details._capAmount,
          status: details._status,
          lpTokenAddress: details._lpTokenAddress || ethers.ZeroAddress,
          nftContractAddress: details._nftContractAddress || ethers.ZeroAddress,
          tierCount: details._tierCount,
          minCommitment: details._minCommitment || BigInt(0),
          lpHolders: details._lpHolders || [],
          milestones: details._milestones || [],
          emergencyMode: details._emergencyMode || false,
          emergencyWithdrawalRequestTime:
            details._emergencyWithdrawalRequestTime || BigInt(0),
          authorizedWithdrawer:
            details._authorizedWithdrawer || ethers.ZeroAddress,
        };
        return pool;
      } catch (err: any) {
        setError(err.message || "Error getting pool from chain");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getProvider]
  );

  // Get pool LP token holders from the blockchain
  const getPoolLpHolders = useCallback(
    async (poolId: string): Promise<string[]> => {
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
    },
    [getProvider]
  );

  // Get user's LP token balance for a pool
  const getUserPoolBalance = useCallback(
    async (userAddress: string, poolId: string): Promise<string> => {
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
    },
    [getProvider]
  );

  // Get user's USDC balance
  const getBalance = useCallback(
    async (userAddress: string): Promise<string> => {
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
    },
    []
  );

  // Get user's native MON balance
  const getNativeBalance = useCallback(
    async (userAddress: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
        if (!rpcUrl) {
          throw new Error("RPC URL not configured");
        }

        // Create a direct RPC provider instead of using the embedded wallet
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(userAddress);
        return ethers.formatEther(balance);
      } catch (err: any) {
        console.error("Error getting native MON balance:", err);
        setError(err.message || "Error getting native MON balance");
        return "0";
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Distribute revenue to LPs
  const distributeRevenue = useCallback(
    async (
      poolAddress: string,
      amount: number // This parameter is kept for interface consistency but not used
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!signer) {
        console.error("No signer available");
        return { success: false, error: "No wallet connected" };
      }

      try {
        console.log(`Preparing to distribute revenue for pool: ${poolAddress}`);

        // Get the provider
        const provider = await getProvider();
        const signer = await provider.getSigner();

        // Create contract instance
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Call the distributeRevenue function - note that it doesn't take any parameters
        const tx = await poolContract.distributeRevenue({
          ...getRecommendedGasParams(),
        });

        console.log("Distribution transaction submitted:", tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log("Distribution transaction confirmed:", receipt);

        // Add detailed logging of the transaction receipt
        console.log("Transaction receipt:", {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          logs: receipt.logs.map((log: ethers.Log) => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
          })),
        });

        // Debug log all events with detailed information
        console.log("Number of logs:", receipt.logs.length);
        console.log("Detailed logs:");
        receipt.logs.forEach((log: ethers.Log, index: number) => {
          console.log(`\nLog ${index}:`);
          console.log("Address:", log.address);
          console.log("Topics:", log.topics);
          console.log("Data:", log.data);
          console.log("Block number:", log.blockNumber);
          console.log("Transaction hash:", log.transactionHash);
          console.log("Block hash:", log.blockHash);
          console.log("Removed:", log.removed);
        });

        // Check if the transaction was successful
        if (!receipt.status) {
          // Try to get the revert reason
          const code = await provider.call({
            ...tx,
            blockTag: receipt.blockNumber,
          });
          console.error("Transaction failed with code:", code);
          throw new Error("Transaction failed on chain");
        }

        return {
          success: true,
          txHash: tx.hash,
        };
      } catch (error) {
        console.error("Error in distributeRevenue:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check for specific error messages
        if (errorMessage.includes("user rejected transaction")) {
          return { success: false, error: "Transaction rejected by user" };
        } else if (errorMessage.includes("insufficient funds")) {
          return {
            success: false,
            error: "Insufficient funds for transaction",
          };
        }

        return { success: false, error: errorMessage };
      }
    },
    [signer, getProvider]
  );

  return {
    isLoading,
    error,
    withdrawFromPool,
    updatePoolName,
    updateMinCommitment,
    getPool,
    getPoolLpHolders,
    getUserPoolBalance,
    getBalance,
    getNativeBalance,
    walletAddress:
      wallets.find((w) => w.walletClientType === "privy")?.address || null,
    walletsReady,
    privyReady,
    getProvider,
    distributeRevenue,
  };
}
