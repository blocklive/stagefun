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
  StageDotFunPoolFactoryABI,
  getPoolByName,
  getPoolContract,
  getStageDotFunPoolFactoryContract,
} from "../lib/contracts/StageDotFunPool";
import { supabase } from "../lib/supabase";

interface PoolCreationData {
  id: string;
  name: string;
  ticker: string;
  description: string;
  target_amount: number;
  min_commitment: number;
  currency: string;
  token_amount: number;
  token_symbol: string;
  location: string;
  venue: string;
  status: string;
  funding_stage: string;
  ends_at: string;
  creator_id: string;
  raised_amount: number;
  image_url: string | null;
  social_links: any;
}

interface BlockchainPoolResult {
  receipt: any;
  poolAddress: string;
  lpTokenAddress: string;
  transactionHash: string;
}

interface ContractInteractionHookResult {
  isLoading: boolean;
  error: string | null;
  createPool: (
    name: string,
    uniqueId: string,
    symbol: string,
    endTime: number,
    targetAmount: number,
    minCommitment: number
  ) => Promise<any>;
  createPoolWithDatabase: (
    poolData: PoolCreationData,
    endTimeUnix: number
  ) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    txHash?: string;
  }>;
  depositToPool: (poolId: string, amount: number) => Promise<any>;
  withdrawFromPool: (
    poolAddress: string,
    amount: number,
    destinationAddress: string
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

  // Create a pool on the blockchain
  const createPool = useCallback(
    async (
      name: string,
      uniqueId: string,
      symbol: string,
      endTime: number,
      targetAmount: number,
      minCommitment: number
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log(
          "Starting pool creation process for:",
          name,
          "uniqueId:",
          uniqueId,
          "symbol:",
          symbol,
          "endTime:",
          endTime,
          "targetAmount:",
          targetAmount,
          "minCommitment:",
          minCommitment
        );

        // Get the embedded wallet
        console.log(
          "Available wallets for pool creation:",
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
            "No embedded wallet found for pool creation. Available wallets:",
            wallets.map((w) => w.walletClientType)
          );
          throw new Error(
            "No embedded wallet found. Please try logging out and logging in again."
          );
        }

        console.log(
          "Using embedded wallet for pool creation:",
          embeddedWallet.address
        );

        // Get the provider and signer
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();

        console.log("Got signer for address:", await signer.getAddress());

        // Check native balance before proceeding
        try {
          const address = await signer.getAddress();
          const balance = await ethersProvider.getBalance(address);
          const balanceInEther = ethers.formatEther(balance);
          console.log("Current MON balance:", balanceInEther);

          // Warn if balance is very low (less than 0.005 MON)
          if (parseFloat(balanceInEther) < 0.005) {
            console.warn(
              "WARNING: Very low MON balance detected:",
              balanceInEther
            );
          }
        } catch (balanceError) {
          console.error("Error checking MON balance:", balanceError);
          // Continue anyway, we'll catch any gas-related errors later
        }

        // Convert amounts to BigInt with proper units
        const targetAmountBigInt = ethers.parseUnits(
          targetAmount.toString(),
          6 // USDC has 6 decimals
        );
        const minCommitmentBigInt = ethers.parseUnits(
          minCommitment.toString(),
          6 // USDC has 6 decimals
        );

        // Get contract addresses
        const contractAddresses = getContractAddresses();
        console.log(
          "Factory contract address:",
          contractAddresses.stageDotFunPoolFactory
        );

        // Get the factory contract with signer
        const factory = new ethers.Contract(
          contractAddresses.stageDotFunPoolFactory,
          StageDotFunPoolFactoryABI,
          signer
        );

        console.log("Creating pool with parameters:", {
          name,
          uniqueId,
          symbol,
          endTime,
          targetAmount: targetAmountBigInt.toString(),
          minCommitment: minCommitmentBigInt.toString(),
        });

        // Call the contract directly - now anyone can create pools
        console.log("Calling factory.createPool directly...");

        try {
          const tx = await factory.createPool(
            name,
            uniqueId,
            symbol,
            BigInt(endTime),
            targetAmountBigInt,
            minCommitmentBigInt,
            {
              gasLimit: 5000000, // Increase gas limit to ensure the transaction goes through
            }
          );

          console.log("Transaction sent:", tx.hash);

          // Wait for transaction to be mined
          console.log("Waiting for transaction confirmation...");
          const receipt = await tx.wait();
          console.log("Pool creation transaction confirmed:", receipt);

          if (!receipt) {
            throw new Error("Transaction receipt not found");
          }

          // Check if the transaction was successful
          if (!receipt.status) {
            throw new Error("Transaction failed on chain");
          }

          // Find the PoolCreated event in the logs
          const event = receipt.logs
            .map((log: ethers.Log) => {
              try {
                return factory.interface.parseLog({
                  topics: log.topics as string[],
                  data: log.data,
                });
              } catch (e) {
                return null;
              }
            })
            .find(
              (event: ethers.LogDescription | null) =>
                event && event.name === "PoolCreated"
            );

          if (!event) {
            throw new Error("PoolCreated event not found in transaction logs");
          }

          // Extract pool address and LP token address from the event
          const poolAddress = event.args.poolAddress;
          const lpTokenAddress = event.args.lpTokenAddress;
          const eventUniqueId = event.args.uniqueId;

          console.log("Pool created successfully:", {
            poolAddress,
            lpTokenAddress,
            eventUniqueId,
            transactionHash: receipt.hash,
          });

          // Note: Database update is handled by the calling component (pools/create/page.tsx)
          // We just return the necessary data here

          return {
            receipt,
            poolAddress,
            lpTokenAddress,
            transactionHash: receipt.hash,
          };
        } catch (txError: any) {
          console.error("Transaction error:", txError);

          // Check for specific error messages related to gas
          const errorMessage = txError.message || "";

          if (
            errorMessage.includes("insufficient funds") ||
            errorMessage.includes("not enough funds") ||
            errorMessage.includes("insufficient balance")
          ) {
            throw new Error(
              "Insufficient MON for gas. Please add more MON to your wallet to deploy the contract."
            );
          } else if (errorMessage.includes("gas required exceeds allowance")) {
            throw new Error(
              "Gas required exceeds your MON balance. Please add more MON to your wallet."
            );
          } else if (errorMessage.includes("user rejected transaction")) {
            throw new Error("Transaction was rejected. Please try again.");
          }

          // Re-throw the original error if it's not one we can provide a better message for
          throw txError;
        }
      } catch (err: any) {
        console.error("Error creating pool:", err);
        setError(err.message || "Error creating pool on chain");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, wallets]
  );

  // Create a pool on the blockchain and then in the database
  const createPoolWithDatabase = useCallback(
    async (poolData: PoolCreationData, endTimeUnix: number) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log("Starting pool creation process with data:", poolData);

        // STEP 1: First create the pool on the blockchain
        let blockchainResult: BlockchainPoolResult;
        try {
          // Call the createPool function to handle the blockchain interaction
          blockchainResult = await createPool(
            poolData.name,
            poolData.id, // Use the uniqueId from poolData
            poolData.token_symbol,
            endTimeUnix, // Use Unix timestamp for blockchain
            poolData.target_amount, // Will be converted to base units in the hook
            poolData.min_commitment || 0 // Will be converted to base units in the hook
          );

          console.log(
            "Pool created successfully on blockchain:",
            blockchainResult
          );
        } catch (blockchainError: any) {
          console.error("Error creating pool on blockchain:", blockchainError);
          return {
            success: false,
            error: blockchainError.message || "Unknown blockchain error",
          };
        }

        // STEP 2: Now that blockchain creation succeeded, add to database
        console.log(
          "Adding pool to database with blockchain details:",
          blockchainResult
        );

        // Add blockchain information to the pool data
        const poolDataWithBlockchain = {
          ...poolData,
          blockchain_tx_hash: blockchainResult.transactionHash,
          blockchain_status: "active",
          contract_address: blockchainResult.poolAddress,
          lp_token_address: blockchainResult.lpTokenAddress,
        };

        // Insert the pool using supabase
        const { data, error } = await supabase
          .from("pools")
          .insert(poolDataWithBlockchain)
          .select()
          .single();

        if (error) {
          console.error("Error creating pool in database:", error);
          return {
            success: false,
            error: "Pool was created on blockchain but database entry failed",
            txHash: blockchainResult.transactionHash,
          };
        }

        console.log("Pool created successfully in database:", data);
        return {
          success: true,
          data,
          txHash: blockchainResult.transactionHash,
        };
      } catch (err: any) {
        console.error("Error in createPoolWithDatabase:", err);
        setError(err.message || "Error creating pool");
        return {
          success: false,
          error: err.message || "Unknown error in pool creation process",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user, createPool]
  );

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
        console.log("Looking up pool in database with ID:", poolId);
        const { data: pool, error: poolError } = await supabase
          .from("pools")
          .select("contract_address, status, id, name")
          .eq("id", poolId)
          .single();

        console.log("Database lookup result:", { pool, error: poolError });

        if (!pool || !pool.contract_address) {
          // If we can't find the pool by ID, try looking it up by name
          console.log("Pool not found by ID, trying to look up by name...");
          const { data: poolsByName, error: nameError } = await supabase
            .from("pools")
            .select("contract_address, status, id, name")
            .eq("name", poolId);

          console.log("Lookup by name result:", {
            pools: poolsByName,
            error: nameError,
          });

          if (poolsByName && poolsByName.length > 0) {
            console.log("Found pool by name:", poolsByName[0]);
            throw new Error(
              `Pool ID mismatch. Try using ID: ${poolsByName[0].id} instead of ${poolId}`
            );
          }

          throw new Error(`Pool contract address not found for ID: ${poolId}`);
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

  // Withdraw funds from a pool
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
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        if (!ethers.isAddress(poolAddress)) {
          throw new Error("Invalid pool address");
        }

        if (!ethers.isAddress(destinationAddress)) {
          throw new Error("Invalid destination address");
        }

        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid withdrawal amount");
        }

        console.log(
          "Starting withdrawal process for pool:",
          poolAddress,
          "amount:",
          amount,
          "destination:",
          destinationAddress
        );

        // Get the embedded wallet
        console.log(
          "Available wallets for withdrawal:",
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
            "No embedded wallet found for withdrawal. Available wallets:",
            wallets.map((w) => w.walletClientType)
          );
          throw new Error(
            "No embedded wallet found. Please try logging out and logging in again."
          );
        }

        console.log(
          "Using embedded wallet for withdrawal:",
          embeddedWallet.address
        );

        // Get the provider and signer
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("Got signer for address:", signerAddress);

        // Get the pool contract
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Get the pool details to verify the caller is authorized
        const poolDetails = await poolContract.getPoolDetails();

        console.log("Pool details:", {
          name: poolDetails._name,
          creator: poolDetails._creator,
          totalDeposits: poolDetails._totalDeposits.toString(),
          revenueAccumulated: poolDetails._revenueAccumulated.toString(),
          authorizedWithdrawer: poolDetails._authorizedWithdrawer,
          status: poolDetails._status,
          milestones: poolDetails._milestones.length,
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

        // Create a transaction tracker to avoid duplicate transactions
        let lastTxHash = "";

        // STEP 1: Set authorized withdrawer if needed
        if (poolDetails._authorizedWithdrawer !== signerAddress) {
          console.log("Setting authorized withdrawer to user's wallet");

          const poolInterface = new ethers.Interface(StageDotFunPoolABI);
          const authData = poolInterface.encodeFunctionData(
            "setAuthorizedWithdrawer",
            [signerAddress]
          );

          const authRequest = {
            to: poolAddress,
            data: authData,
            value: "0",
            from: signerAddress,
            chainId: 10143, // Monad Testnet
          };

          const authUiOptions: SendTransactionModalUIOptions = {
            description: `Setting your wallet as the authorized withdrawer`,
            buttonText: "Authorize Withdrawal",
            transactionInfo: {
              title: "Authorize Withdrawal",
              action: "Set Authorized Withdrawer",
              contractInfo: {
                name: "StageDotFun Pool",
              },
            },
          };

          console.log("Sending authorization transaction");
          const authTxHash = await sendTransaction(authRequest, {
            uiOptions: authUiOptions,
          });

          lastTxHash = authTxHash.hash;

          // Wait for transaction to be mined
          const authReceipt = await ethersProvider.waitForTransaction(
            lastTxHash
          );

          if (!authReceipt?.status) {
            throw new Error("Failed to set authorized withdrawer");
          }

          console.log("Successfully set authorized withdrawer");
        }

        // STEP 2: Check if the default milestone exists
        const milestones = poolDetails._milestones;

        if (milestones.length === 0) {
          throw new Error("No milestones found in the pool");
        }

        console.log(`Found ${milestones.length} milestones in the pool`);

        // Use the default milestone (index 0)
        const defaultMilestoneIndex = 0;
        const defaultMilestone = milestones[defaultMilestoneIndex];

        console.log("Default milestone:", {
          description: defaultMilestone.description,
          amount: defaultMilestone.amount.toString(),
          unlockTime: defaultMilestone.unlockTime.toString(),
          released: defaultMilestone.released,
        });

        // Check if the milestone is already released
        if (defaultMilestone.released) {
          throw new Error("Default milestone has already been released");
        }

        // Check if the requested amount matches the milestone amount
        if (defaultMilestone.amount.toString() !== amountInWei.toString()) {
          throw new Error(
            `Withdrawal amount (${amount}) must match the default milestone amount (${ethers.formatUnits(
              defaultMilestone.amount,
              usdcDecimals
            )})`
          );
        }

        // STEP 3: Withdraw the milestone
        console.log(
          `Withdrawing default milestone (index ${defaultMilestoneIndex})`
        );

        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const withdrawData = poolInterface.encodeFunctionData(
          "withdrawMilestone",
          [defaultMilestoneIndex]
        );

        const withdrawRequest = {
          to: poolAddress,
          data: withdrawData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
        };

        const withdrawUiOptions: SendTransactionModalUIOptions = {
          description: `Withdrawing funds from pool`,
          buttonText: "Withdraw Funds",
          transactionInfo: {
            title: "Withdraw Funds",
            action: "Withdraw Milestone",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending withdraw transaction");
        const withdrawTxHash = await sendTransaction(withdrawRequest, {
          uiOptions: withdrawUiOptions,
        });

        lastTxHash = withdrawTxHash.hash;

        // Wait for transaction to be mined
        const withdrawReceipt = await ethersProvider.waitForTransaction(
          lastTxHash
        );

        if (!withdrawReceipt?.status) {
          throw new Error("Failed to withdraw milestone");
        }

        console.log(`Successfully withdrew milestone ${defaultMilestoneIndex}`);

        // STEP 4: Transfer funds to destination if needed
        if (destinationAddress.toLowerCase() !== signerAddress.toLowerCase()) {
          return await transferFundsToDestination(
            ethersProvider,
            signer,
            signerAddress,
            destinationAddress,
            amount,
            lastTxHash
          );
        }

        return {
          success: true,
          txHash: lastTxHash,
        };
      } catch (err: any) {
        console.error("Error in withdrawFromPool:", err);
        setError(err.message || "Error withdrawing from pool");
        return {
          success: false,
          error: err.message || "Unknown error in withdrawal process",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user, wallets, sendTransaction]
  );

  // Helper function to transfer funds to destination address
  const transferFundsToDestination = async (
    ethersProvider: ethers.BrowserProvider,
    signer: ethers.Signer,
    signerAddress: string,
    destinationAddress: string,
    amount: number,
    previousTxHash: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> => {
    try {
      console.log(
        `Transferring funds to destination address: ${destinationAddress}`
      );

      // Get the USDC token address
      const usdcAddress = getContractAddresses().usdc;

      // Create contract interface for USDC transfer
      const usdcInterface = new ethers.Interface([
        "function transfer(address to, uint256 value) returns (bool)",
      ]);

      const transferData = usdcInterface.encodeFunctionData("transfer", [
        destinationAddress,
        ethers.parseUnits(amount.toString(), 6),
      ]);

      // Prepare the transaction request
      const transferRequest = {
        to: usdcAddress,
        data: transferData,
        value: "0",
        from: signerAddress,
        chainId: 10143, // Monad Testnet
      };

      // Set UI options for the transaction
      const transferUiOptions: SendTransactionModalUIOptions = {
        description: `Transferring ${amount} USDC to ${destinationAddress}`,
        buttonText: "Transfer USDC",
        transactionInfo: {
          title: "Transfer USDC",
          action: "Transfer Funds",
          contractInfo: {
            name: "USDC Token",
          },
        },
      };

      console.log("Sending transfer transaction");
      const transferTxHash = await sendTransaction(transferRequest, {
        uiOptions: transferUiOptions,
      });

      // Wait for transaction to be mined
      const transferReceipt = await ethersProvider.waitForTransaction(
        transferTxHash.hash
      );

      if (!transferReceipt?.status) {
        throw new Error("Failed to transfer funds to destination address");
      }

      console.log("Successfully transferred funds to destination address");
      return {
        success: true,
        txHash: transferTxHash.hash,
      };
    } catch (error: any) {
      console.error("Error transferring funds to destination:", error);
      return {
        success: false,
        error: error.message || "Failed to transfer funds to destination",
        txHash: previousTxHash, // Return the previous transaction hash since the withdrawal itself succeeded
      };
    }
  };

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

        // Create contract instance
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Call the distributeRevenue function - note that it doesn't take any parameters
        const tx = await poolContract.distributeRevenue({
          gasLimit: 3000000, // Increased gas limit for safety
        });

        console.log("Distribution transaction submitted:", tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log("Distribution transaction confirmed:", receipt);

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
    [signer]
  );

  return {
    isLoading,
    error,
    createPool,
    createPoolWithDatabase,
    depositToPool,
    withdrawFromPool,
    getPool,
    getPoolLpHolders,
    getUserPoolBalance,
    getBalance,
    getNativeBalance,
    walletAddress: user?.wallet?.address || null,
    walletsReady,
    privyReady,
    getProvider,
    distributeRevenue,
  };
}
