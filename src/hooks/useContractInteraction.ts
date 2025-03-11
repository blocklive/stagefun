import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import type {
  UnsignedTransactionRequest,
  SendTransactionModalUIOptions,
} from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
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
  getContractAddresses,
  StageDotFunPoolABI,
  getPoolByName,
  getPoolContract,
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
  getNativeBalance: (userAddress: string) => Promise<string>;
  walletAddress: string | null;
  walletsReady: boolean;
  privyReady: boolean;
  getProvider: () => Promise<ethers.Provider>;
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

  // Create a pool on the blockchain
  const createPool = async (name: string, ticker: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      // Set end time to 2 days from now by default
      const endTime = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
      // Default target amount to 1000 USDC (1000 * 10^6)
      const targetAmount = BigInt(1000_000_000);
      // Default min commitment to 0 USDC
      const minCommitment = BigInt(0);

      const { receipt, poolId } = await createPoolOnChain(
        signer,
        name,
        `pool-${Date.now()}`, // Generate a unique ID based on timestamp
        ticker,
        BigInt(endTime),
        targetAmount,
        minCommitment
      );
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
        console.log(
          "Available wallets for deposit:",
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
            "No embedded wallet found for deposit. Available wallets:",
            wallets.map((w) => w.walletClientType)
          );
          throw new Error(
            "No embedded wallet found. Please try logging out and logging in again."
          );
        }

        console.log(
          "Using embedded wallet for deposit:",
          embeddedWallet.address
        );

        // Get the provider and create contract instances
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const usdcContract = getUSDCContract(ethersProvider);
        const usdcSymbol = await usdcContract.symbol();
        const usdcDecimals = await usdcContract.decimals();
        const amountBigInt = ethers.parseUnits(amount.toString(), usdcDecimals);
        const amountFormatted = ethers.formatUnits(amountBigInt, usdcDecimals);

        // Get the pool contract address from the database
        const { data: pool } = await supabase
          .from("pools")
          .select("contract_address, status")
          .eq("id", poolId)
          .single();

        if (!pool || !pool.contract_address) {
          throw new Error("Pool contract address not found");
        }

        // Check if pool is active
        const poolContract = new ethers.Contract(
          pool.contract_address,
          StageDotFunPoolABI,
          ethersProvider
        );
        const poolStatus = await poolContract.status();
        console.log("Pool status:", poolStatus);

        if (poolStatus !== BigInt(1)) {
          throw new Error("Pool is not active");
        }

        // Check USDC balance
        const usdcBalance = await usdcContract.balanceOf(signerAddress);
        console.log("USDC Balance check:", {
          balance: ethers.formatUnits(usdcBalance, usdcDecimals),
          required: amountFormatted,
          hasEnough: usdcBalance >= amountBigInt,
        });

        if (usdcBalance < amountBigInt) {
          throw new Error(
            `Insufficient USDC balance. You have ${ethers.formatUnits(
              usdcBalance,
              usdcDecimals
            )} USDC but trying to deposit ${amountFormatted} USDC`
          );
        }

        // Get pool details to check constraints
        const poolDetails = await poolContract.getPoolDetails();

        console.log("Raw pool details from contract:", {
          name: poolDetails._name,
          minCommitment: poolDetails._minCommitment.toString(),
          totalDeposits: poolDetails._totalDeposits.toString(),
          targetAmount: poolDetails._targetAmount.toString(),
          status: poolDetails._status.toString(),
          endTime: poolDetails._endTime.toString(),
          lpTokenAddress: poolDetails._lpTokenAddress,
          lpHolders: poolDetails._lpHolders,
          milestones: poolDetails._milestones,
          emergencyMode: poolDetails._emergencyMode,
          emergencyWithdrawalRequestTime:
            poolDetails._emergencyWithdrawalRequestTime,
          authorizedWithdrawer: poolDetails._authorizedWithdrawer,
        });

        // Convert all amounts to natural USDC values for display and comparison
        const displayValues = {
          minCommitment: Number(
            ethers.formatUnits(poolDetails._minCommitment, usdcDecimals)
          ),
          totalDeposits: Number(
            ethers.formatUnits(poolDetails._totalDeposits, usdcDecimals)
          ),
          targetAmount: Number(
            ethers.formatUnits(poolDetails._targetAmount, usdcDecimals)
          ),
          status: Number(poolDetails._status),
          endTime: new Date(Number(poolDetails._endTime) * 1000),
        };

        console.log("Converted values:", {
          displayValues,
          inputAmount: amount,
          inputAmountInWei: amountBigInt.toString(),
        });

        // Check minimum commitment (using raw USDC amounts)
        console.log("Detailed commitment check:", {
          minCommitmentRaw: poolDetails._minCommitment.toString(),
          amountRaw: amountBigInt.toString(),
          minCommitmentFormatted: ethers.formatUnits(
            poolDetails._minCommitment,
            usdcDecimals
          ),
          amountFormatted: ethers.formatUnits(amountBigInt, usdcDecimals),
          isSufficient: amountBigInt >= poolDetails._minCommitment,
        });

        // Convert min commitment to natural USDC value for comparison
        const minCommitmentNatural = Number(
          ethers.formatUnits(poolDetails._minCommitment, usdcDecimals)
        );

        if (amount < minCommitmentNatural) {
          throw new Error(
            `Amount is below minimum commitment of ${minCommitmentNatural} USDC`
          );
        }

        // Check end time
        if (displayValues.endTime < new Date()) {
          throw new Error("Pool has ended");
        }

        console.log("Pool checks passed:", {
          status: displayValues.status,
          minCommitment: `${displayValues.minCommitment} USDC`,
          endTime: displayValues.endTime.toISOString(),
          amount: `${amount} USDC`,
        });

        console.log("Contract setup complete:", {
          usdcSymbol,
          usdcDecimals,
          amountBigInt: amountBigInt.toString(),
          amountFormatted,
        });

        // Check allowance
        const currentAllowance = await usdcContract.allowance(
          signerAddress,
          pool.contract_address
        );

        console.log("Current allowance:", {
          allowance: currentAllowance.toString(),
          required: amountBigInt.toString(),
          needsApproval: currentAllowance < amountBigInt,
        });

        // Handle approval if needed
        if (currentAllowance < amountBigInt) {
          // Create contract interface for USDC
          const usdcInterface = new ethers.Interface([
            "function approve(address spender, uint256 value) returns (bool)",
          ]);

          const approvalData = usdcInterface.encodeFunctionData("approve", [
            pool.contract_address,
            amountBigInt,
          ]);

          // Prepare the approval transaction request
          const approvalRequest = {
            to: getContractAddresses().usdc,
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

          console.log("Sending approval transaction", approvalRequest);
          const approvalTxHash = await sendTransaction(approvalRequest, {
            uiOptions: approvalUiOptions,
          });
          console.log("Approval transaction sent:", approvalTxHash);

          // Wait for approval to be mined
          const approvalReceipt = await ethersProvider.waitForTransaction(
            approvalTxHash.hash
          );
          console.log("Approval confirmed:", approvalReceipt);

          if (!approvalReceipt?.status) {
            throw new Error("USDC approval failed");
          }
        }

        // Create contract interface for pool deposit
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const depositData = poolInterface.encodeFunctionData("deposit", [
          amountBigInt,
        ]);

        // Prepare the deposit transaction request
        const depositRequest = {
          to: pool.contract_address,
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

        console.log("Sending deposit transaction", {
          request: depositRequest,
          encodedData: depositData,
          functionSelector: depositData.slice(0, 10),
        });

        console.log("🔄 About to call Privy sendTransaction...");
        try {
          const txHash = await sendTransaction(depositRequest, {
            uiOptions: depositUiOptions,
          });

          console.log("Transaction hash received:", txHash);

          // Wait for transaction to be mined using ethers provider
          const receipt = await ethersProvider.waitForTransaction(txHash.hash);

          if (!receipt) {
            throw new Error("Transaction receipt not found");
          }

          // Add detailed logging of the transaction receipt
          console.log("Transaction receipt:", {
            hash: receipt.hash,
            blockNumber: receipt.blockNumber,
            status: receipt.status,
            logs: receipt.logs.map((log) => ({
              address: log.address,
              topics: log.topics,
              data: log.data,
            })),
          });

          // Check if the transaction was successful
          if (!receipt.status) {
            // Try to get the revert reason
            const code = await ethersProvider.call({
              ...depositRequest,
              blockTag: receipt.blockNumber,
            });
            console.error("Transaction failed with code:", code);
            throw new Error("Transaction failed on chain");
          }

          // Create pool contract instance to parse logs
          const poolContract = new ethers.Contract(
            pool.contract_address,
            StageDotFunPoolABI,
            ethersProvider
          );

          try {
            // Look for Deposit event in the logs by checking the topics
            const depositEventSignature =
              poolContract.interface.getEvent("Deposit")?.topicHash;

            if (depositEventSignature) {
              const depositEvent = receipt.logs.find(
                (log) => log.topics[0] === depositEventSignature
              );

              if (!depositEvent) {
                console.warn("No Deposit event found in transaction logs");
              } else {
                const parsedEvent = poolContract.interface.parseLog({
                  topics: depositEvent.topics,
                  data: depositEvent.data,
                });
                console.log("Found and parsed Deposit event:", parsedEvent);
              }
            } else {
              console.warn(
                "Could not get Deposit event signature from contract interface"
              );
            }
          } catch (error) {
            console.warn("Error parsing Deposit event:", error);
            // Don't throw since the transaction itself succeeded
          }

          // Fetch updated pool details to confirm the deposit
          const updatedPoolDetails = await poolContract.getPoolDetails();
          console.log("Deposit successful, receipt:", receipt);
          return receipt;
        } catch (err) {
          console.error("Error in depositToPool transaction:", {
            error: err,
            message: err instanceof Error ? err.message : "Unknown error",
            code: (err as any).code,
            data: (err as any).data,
            transaction: (err as any).transaction,
            receipt: (err as any).receipt,
          });

          // Try to get more error details if possible
          if (
            err instanceof Error &&
            err.message.includes("execution reverted")
          ) {
            const revertReason = err.message
              .split("execution reverted:")[1]
              ?.trim();
            throw new Error(
              `Transaction reverted: ${revertReason || "Unknown reason"}`
            );
          }

          throw err;
        }
      } catch (err) {
        console.error("Error in depositToPool:", {
          error: err,
          message: err instanceof Error ? err.message : "Unknown error",
          code: (err as any).code,
          data: (err as any).data,
          transaction: (err as any).transaction,
          receipt: (err as any).receipt,
        });
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
        totalDeposits: BigInt(details._totalDeposits),
        revenueAccumulated: BigInt(details._revenueAccumulated),
        endTime: BigInt(details._endTime),
        targetAmount: BigInt(details._targetAmount),
        minCommitment: BigInt(details._minCommitment),
        status: Number(details._status),
        lpTokenAddress: details._lpTokenAddress,
        lpHolders: details._lpHolders,
        milestones: details._milestones.map(
          (m: {
            description: string;
            amount: bigint;
            unlockTime: bigint;
            approved: boolean;
            released: boolean;
          }) => ({
            description: m.description,
            amount: BigInt(m.amount),
            unlockTime: BigInt(m.unlockTime),
            approved: m.approved,
            released: m.released,
          })
        ),
        emergencyMode: details._emergencyMode,
        emergencyWithdrawalRequestTime: BigInt(
          details._emergencyWithdrawalRequestTime
        ),
        authorizedWithdrawer: details._authorizedWithdrawer,
      };
      return pool;
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

  // Get user's native MON balance
  const getNativeBalance = async (userAddress: string): Promise<string> => {
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
    getNativeBalance,
    walletAddress: user?.wallet?.address || null,
    walletsReady,
    privyReady,
    getProvider,
  };
}
