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
  StageDotFunLiquidityABI,
} from "../lib/contracts/StageDotFunPool";
import {
  getRecommendedGasParams,
  getRecommendedGasParamsAsStrings,
} from "../lib/contracts/gas-utils";
import { useSmartWallet } from "./useSmartWallet";

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
  beginExecution: (
    poolAddress: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function useContractInteraction(): ContractInteractionHookResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
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

        if (!smartWalletAddress) {
          throw new Error(
            "Smart wallet not available. Please ensure you have a smart wallet configured."
          );
        }

        console.log(
          `Starting withdrawal process for pool: ${poolAddress}, amount: ${amount}, destination: ${destinationAddress}`
        );

        console.log("Using smart wallet for withdrawal:", smartWalletAddress);

        // Get provider directly for checks
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );

        // Get the pool contract (readonly)
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          provider
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
        if (Number(poolDetails._status) !== 7) {
          // 7 is EXECUTING status
          throw new Error("Pool must be in EXECUTING status to withdraw funds");
        }

        // Get owner address - this is the creator of the pool
        const owner = await poolContract.creator();
        console.log("Pool owner/creator:", owner);

        // Check if the smart wallet is the owner
        if (smartWalletAddress.toLowerCase() !== owner.toLowerCase()) {
          throw new Error(
            `Only the pool creator's smart wallet can withdraw funds. Your smart wallet (${smartWalletAddress}) cannot withdraw since this pool was created by a different wallet (${owner}).`
          );
        }

        // Important note: Even if destinationAddress is specified, funds will be sent to the owner address
        // due to how the contract function is implemented
        if (destinationAddress.toLowerCase() !== owner.toLowerCase()) {
          console.warn(
            `Note: Specified destination address (${destinationAddress}) will be ignored. Funds will be sent to the pool owner (${owner}) as per contract implementation.`
          );
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

        // Use smart wallet to call the contract
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "withdrawFunds",
          [amountInWei],
          `Withdrawing ${amount} USDC from pool to owner address (${owner})`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to withdraw funds from pool");
        }

        console.log(
          `Successfully withdrew funds from pool to owner address (${owner})`
        );
        return {
          success: true,
          txHash: result.txHash,
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
    [user, smartWalletAddress, callContractFunction]
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
          targetReachedTime: details._targetReachedTime || BigInt(0),
          capReachedTime: details._capReachedTime || BigInt(0),
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
      try {
        if (!user) {
          console.error("No user logged in");
          return { success: false, error: "No user logged in" };
        }

        if (!smartWalletAddress) {
          return {
            success: false,
            error:
              "Smart wallet not available. Please ensure you have a smart wallet configured.",
          };
        }

        console.log("Distribution parameters:", {
          poolAddress,
          amount,
          smartWalletAddress,
        });

        // Get pool contract to check status and details
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          provider
        );

        // Get and log raw values first
        const [status, rawRevenueAccumulated, lpTokenAddress] =
          await Promise.all([
            poolContract.status(),
            poolContract.revenueAccumulated(),
            poolContract.lpToken(),
          ]);

        // Get holders and their balances
        const holders = await poolContract.getLpHolders();
        const lpTokenContract = new ethers.Contract(
          lpTokenAddress,
          [
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
          ],
          provider
        );

        // Calculate distribution amounts
        const totalSupply = await lpTokenContract.totalSupply();
        const balances = await Promise.all(
          holders.map(async (holder: string) => {
            try {
              return await lpTokenContract.balanceOf(holder);
            } catch (error) {
              console.error(
                `Error getting balance for holder ${holder}:`,
                error
              );
              return BigInt(0);
            }
          })
        );

        // Log distribution details
        console.log("Distribution calculation:", {
          totalRevenue: ethers.formatUnits(rawRevenueAccumulated, 6),
          totalSupply: ethers.formatUnits(totalSupply, 6),
          holders: holders.map((holder: string, i: number) => {
            const balance = ethers.formatUnits(balances[i], 6);
            const expectedAmount = ethers.formatUnits(
              (rawRevenueAccumulated * balances[i]) / totalSupply,
              6
            );

            // Format with more decimals if the number has them
            const formatWithPrecision = (value: string) => {
              const num = parseFloat(value);
              // Check if number has more than 6 decimal places
              if (
                num.toString().includes(".") &&
                num.toString().split(".")[1].length > 6
              ) {
                return num.toFixed(8); // Show 8 decimal places
              }
              return value;
            };

            return {
              address: holder,
              balance: formatWithPrecision(balance),
              share: Number((balances[i] * BigInt(100)) / totalSupply),
              expectedAmount: formatWithPrecision(expectedAmount),
            };
          }),
        });

        // Call distributeRevenue
        console.log(
          "Preparing to distribute revenue using smart wallet:",
          smartWalletAddress
        );

        // Use smart wallet to call the contract
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "distributeRevenue",
          [], // No parameters for distribute revenue
          `Distributing revenue for pool ${poolAddress}`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to distribute revenue");
        }

        console.log("Successfully distributed revenue using smart wallet");
        return {
          success: true,
          txHash: result.txHash,
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
        } else if (errorMessage.includes("No revenue to distribute")) {
          return {
            success: false,
            error: "No revenue available to distribute",
          };
        }

        return { success: false, error: errorMessage };
      }
    },
    [user, smartWalletAddress, callContractFunction]
  );

  // Begin execution
  const beginExecution = useCallback(
    async (
      poolAddress: string
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      try {
        if (!user) {
          throw new Error("No user logged in");
        }

        if (!smartWalletAddress) {
          throw new Error("Smart wallet not available");
        }

        console.log(`Starting execution for pool: ${poolAddress}`);
        console.log("Using smart wallet for execution:", smartWalletAddress);

        // Use smart wallet to call the contract
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "beginExecution",
          [], // No parameters for beginExecution
          `Starting execution for pool ${poolAddress}`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to begin execution");
        }

        console.log("Execution started successfully");
        return {
          success: true,
          txHash: result.txHash,
        };
      } catch (error) {
        console.error("Error in beginExecution:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    },
    [user, smartWalletAddress, callContractFunction]
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
    beginExecution,
  };
}
