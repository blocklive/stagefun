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
import { PoolStatus } from "../lib/contracts/types";

interface PoolCreationData {
  id: string;
  name: string;
  ticker: string;
  description: string;
  target_amount: number;
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
  tiers?: any[];
  cap_amount?: number;
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
  depositToPool: (
    contractAddress: string,
    amount: number,
    tierId: number
  ) => Promise<any>;
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
          signerAddress: await signer.getAddress(),
        });

        // Call the contract directly
        const tx = await factory.createPool(
          name,
          uniqueId,
          symbol,
          BigInt(endTime),
          await signer.getAddress(), // owner
          await signer.getAddress(), // creator
          targetAmountBigInt,
          targetAmountBigInt, // Using target amount as cap amount for now
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

        // Get the pool address from the factory event
        const factoryEvent = receipt.logs.find(
          (log: ethers.Log) =>
            log.address.toLowerCase() ===
            contractAddresses.stageDotFunPoolFactory.toLowerCase()
        );

        if (!factoryEvent) {
          throw new Error("No event found from factory contract");
        }

        // The pool address will be in the first topic after the event signature
        const poolAddress = "0x" + factoryEvent.topics[1].slice(26);
        console.log("Found pool address from event:", poolAddress);

        // Create pool contract instance to get pool details
        const poolContract = new ethers.Contract(
          poolAddress,
          StageDotFunPoolABI,
          signer
        );

        // Get pool details
        console.log("Getting pool details for address:", poolAddress);
        const details = await poolContract.getPoolDetails();
        console.log("Raw pool details:", details);

        // Destructure the details array
        const [
          poolName, // string
          poolUniqueId, // string
          poolCreator, // address
          poolTotalDeposits, // uint256
          poolRevenue, // uint256
          poolEndTime, // uint256
          poolTargetAmount, // uint256
          poolCapAmount, // uint256
          poolStatus, // uint8
          lpTokenAddress, // address
          nftContractAddress, // address
          tierCount, // uint256
        ] = details;

        console.log("Pool details:", {
          name: poolName,
          uniqueId: poolUniqueId,
          creator: poolCreator,
          totalDeposits: poolTotalDeposits.toString(),
          revenueAccumulated: poolRevenue.toString(),
          endTime: poolEndTime.toString(),
          targetAmount: poolTargetAmount.toString(),
          capAmount: poolCapAmount.toString(),
          status: poolStatus,
          lpTokenAddress,
          nftContractAddress,
          tierCount: tierCount.toString(),
        });

        const pool: ContractPool = {
          name: poolName,
          uniqueId: poolUniqueId,
          creator: poolCreator,
          totalDeposits: poolTotalDeposits,
          revenueAccumulated: poolRevenue,
          endTime: poolEndTime,
          targetAmount: poolTargetAmount,
          capAmount: poolCapAmount,
          status: poolStatus,
          lpTokenAddress: lpTokenAddress,
          nftContractAddress: nftContractAddress,
          tierCount: tierCount,
          minCommitment: details._minCommitment || BigInt(0),
          lpHolders: [],
          milestones: [],
          emergencyMode: details._emergencyMode || false,
          emergencyWithdrawalRequestTime:
            details._emergencyWithdrawalRequestTime || BigInt(0),
          authorizedWithdrawer:
            details._authorizedWithdrawer || ethers.ZeroAddress,
        };

        return {
          receipt,
          poolAddress,
          lpTokenAddress,
          transactionHash: receipt.hash,
        };
      } catch (err: any) {
        console.error("Error creating pool:", err);
        setError(err.message || "Error creating pool on chain");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, wallets, sendTransaction]
  );

  // Helper function to create and link reward items
  const createAndLinkRewardItems = async (
    tiers: any[],
    availableRewardItems: any[],
    poolCreatorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // First, create all reward items in the database
      const { data: createdRewardItems, error: rewardItemsError } =
        await supabase
          .from("reward_items")
          .insert(
            availableRewardItems.map((item) => ({
              name: item.name,
              description: item.description,
              type: item.type,
              metadata: item.metadata,
              creator_id: poolCreatorId,
              is_active: true,
            }))
          )
          .select();

      if (rewardItemsError) {
        console.error("Error creating reward items:", rewardItemsError);
        return { success: false, error: "Failed to create reward items" };
      }

      // Create a map of original reward IDs to new database IDs
      const rewardIdMap = new Map(
        createdRewardItems.map((item, index) => [
          availableRewardItems[index].id,
          item.id,
        ])
      );

      // Now, create the tier-reward links
      const tierRewardLinks = tiers.flatMap((tier) => {
        if (!tier.rewardItems || tier.rewardItems.length === 0) return [];

        return tier.rewardItems
          .filter((itemId: string) => itemId !== "nft") // Skip NFT rewards
          .map((itemId: string) => ({
            tier_id: tier.id,
            reward_item_id: rewardIdMap.get(itemId),
            quantity: 1,
          }))
          .filter(
            (link: {
              tier_id: string;
              reward_item_id: string | undefined;
              quantity: number;
            }) => link.reward_item_id
          ); // Only include links with valid reward IDs
      });

      if (tierRewardLinks.length > 0) {
        const { error: tierRewardLinksError } = await supabase
          .from("tier_reward_items")
          .insert(tierRewardLinks);

        if (tierRewardLinksError) {
          console.error(
            "Error creating tier reward links:",
            tierRewardLinksError
          );
          return { success: false, error: "Failed to link rewards to tiers" };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error in createAndLinkRewardItems:", error);
      return { success: false, error: "Failed to process reward items" };
    }
  };

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
          blockchainResult = await createPool(
            poolData.name,
            poolData.id,
            poolData.token_symbol,
            endTimeUnix,
            poolData.target_amount,
            poolData.cap_amount || 0
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
          ends_at: new Date(Number(poolData.ends_at) * 1000).toISOString(),
        };

        // Remove tiers from pool data before inserting
        const { tiers, ...poolDataForInsertion } = poolDataWithBlockchain;

        console.log("Inserting pool data into database:", poolDataForInsertion);

        // Insert the pool using supabase
        const { data: insertedPool, error: poolError } = await supabase
          .from("pools")
          .insert(poolDataForInsertion)
          .select()
          .single();

        if (poolError) {
          console.error("Error creating pool in database:", poolError);
          return {
            success: false,
            error: "Pool was created on blockchain but database entry failed",
            txHash: blockchainResult.transactionHash,
          };
        }

        // Create tiers in database first
        if (tiers && tiers.length > 0) {
          const { data: insertedTiers, error: tiersError } = await supabase
            .from("tiers")
            .insert(
              tiers.map((tier: any) => ({
                pool_id: insertedPool.id,
                name: tier.name,
                description: tier.description || `${tier.name} tier`,
                price: tier.isVariablePrice ? 0 : tier.price,
                is_variable_price: tier.isVariablePrice,
                min_price: tier.isVariablePrice ? tier.minPrice : null,
                max_price: tier.isVariablePrice ? tier.maxPrice : null,
                max_supply: tier.maxPatrons,
                current_supply: 0,
                is_active: tier.isActive,
              }))
            )
            .select();

          if (tiersError) {
            console.error("Error creating tiers in database:", tiersError);
            return {
              success: false,
              error: "Pool was created but tiers failed to save",
              txHash: blockchainResult.transactionHash,
            };
          }

          // Create and link reward items
          const rewardResult = await createAndLinkRewardItems(
            insertedTiers,
            tiers.map((tier) => ({
              id: tier.id,
              name: tier.name,
              description: tier.name,
              type: tier.name,
              metadata: tier.name,
            })),
            insertedPool.creator_id
          );

          if (!rewardResult.success) {
            return {
              success: false,
              error: rewardResult.error || "Failed to process rewards",
              txHash: blockchainResult.transactionHash,
            };
          }
        }

        // Create tiers on the contract
        const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
        );

        if (!embeddedWallet) {
          console.error("No embedded wallet found for creating tiers");
          return {
            success: false,
            error: "No embedded wallet found for creating tiers",
            txHash: blockchainResult.transactionHash,
          };
        }

        // Rest of the contract tier creation code...

        console.log("Pool created successfully in database:", insertedPool);
        return {
          success: true,
          data: insertedPool,
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
    async (
      contractAddress: string,
      amount: number,
      tierId: number
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log(
          `Starting commitment process for pool: ${contractAddress}, amount: ${amount}, tierId: ${tierId}`
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

        // Convert amount to USDC base units (6 decimals)
        console.log("Converting amount to base units:", {
          originalAmount: amount,
          amountString: amount.toString(),
        });

        // The amount is already in human-readable format (e.g. 0.01), so we need to convert to base units
        const amountBigInt = ethers.parseUnits(amount.toString(), usdcDecimals);
        console.log("Amount conversion:", {
          originalAmount: amount,
          amountInBaseUnits: amountBigInt.toString(),
          formattedAmount: ethers.formatUnits(amountBigInt, usdcDecimals),
        });

        // Get the pool contract
        const poolContract = getPoolContract(ethersProvider, contractAddress);

        // Get pool details and status
        const poolDetails = await poolContract.getPoolDetails();
        console.log("Pool details:", poolDetails);

        // Log raw pool status for debugging
        console.log("Pool status details:", {
          rawStatus: poolDetails._status,
          statusType: typeof poolDetails._status,
          isActive: Number(poolDetails._status) === 1,
          statusNumber: Number(poolDetails._status),
          statusString: PoolStatus[Number(poolDetails._status)],
          poolDetails: {
            name: poolDetails._name,
            uniqueId: poolDetails._uniqueId,
            creator: poolDetails._creator,
            totalDeposits: ethers.formatUnits(
              poolDetails._totalDeposits,
              usdcDecimals
            ),
            revenueAccumulated: ethers.formatUnits(
              poolDetails._revenueAccumulated,
              usdcDecimals
            ),
            endTime: poolDetails._endTime.toString(),
            targetAmount: ethers.formatUnits(
              poolDetails._targetAmount,
              usdcDecimals
            ),
            capAmount: ethers.formatUnits(poolDetails._capAmount, usdcDecimals),
            status: poolDetails._status.toString(),
          },
        });

        // Get and log the target tier details
        const targetTier = await poolContract.getTier(tierId);
        console.log("Target tier details from contract:", {
          tierId,
          tierDetails: targetTier,
        });

        // Get the exact tier price and use it for the commitment
        const tierPrice = targetTier[1]; // price is the second element in the tier array
        console.log("Using tier price for commitment:", {
          tierPrice: tierPrice.toString(),
          tierPriceFormatted: ethers.formatUnits(tierPrice, usdcDecimals),
        });

        // Check requirements
        const now = Math.floor(Date.now() / 1000);
        const requirements = {
          tierIdValid: tierId < poolDetails._tierCount,
          tierActive: targetTier[2], // isActive is the third element
          poolActive: Number(poolDetails._status) === 1, // Convert BigInt to number for comparison
          notFunded: poolDetails._totalDeposits < poolDetails._targetAmount,
          notEnded: now <= poolDetails._endTime,
          withinCap:
            poolDetails._totalDeposits + tierPrice <= poolDetails._capAmount,
          patronsCheck:
            targetTier[7] === BigInt(0) || targetTier[8] < targetTier[7], // maxPatrons and currentPatrons
        };

        console.log("Requirement checks:", {
          ...requirements,
          now,
          endTime: poolDetails._endTime,
          totalDeposits: ethers.formatUnits(
            poolDetails._totalDeposits,
            usdcDecimals
          ),
          targetAmount: ethers.formatUnits(
            poolDetails._targetAmount,
            usdcDecimals
          ),
          capAmount: ethers.formatUnits(poolDetails._capAmount, usdcDecimals),
        });

        // Verify all requirements are met
        if (!requirements.poolActive) {
          throw new Error("Pool is not active");
        }
        if (!requirements.tierActive) {
          throw new Error("Tier is not active");
        }
        if (!requirements.tierIdValid) {
          throw new Error("Invalid tier ID");
        }
        if (!requirements.notFunded) {
          throw new Error("Pool is already fully funded");
        }
        if (!requirements.notEnded) {
          throw new Error("Pool has ended");
        }
        if (!requirements.withinCap) {
          throw new Error("Commitment would exceed pool cap");
        }
        if (!requirements.patronsCheck) {
          throw new Error("Tier has reached maximum number of patrons");
        }

        // Check USDC balance and allowance
        const usdcBalance = await usdcContract.balanceOf(signerAddress);
        console.log("USDC Balance check:", {
          balance: ethers.formatUnits(usdcBalance, usdcDecimals),
          required: ethers.formatUnits(tierPrice, usdcDecimals),
          hasEnough: usdcBalance >= tierPrice,
        });

        // Check USDC approval
        const currentAllowance = await usdcContract.allowance(
          signerAddress,
          contractAddress
        );

        console.log("USDC Approval check:", {
          currentAllowance: currentAllowance.toString(),
          requiredAmount: tierPrice.toString(),
          needsApproval: currentAllowance < tierPrice,
        });

        if (currentAllowance < tierPrice) {
          // Create contract interface for USDC
          const usdcInterface = new ethers.Interface([
            "function approve(address spender, uint256 value) returns (bool)",
          ]);

          const approvalData = usdcInterface.encodeFunctionData("approve", [
            contractAddress,
            tierPrice,
          ]);

          console.log("Sending USDC approval:", {
            spender: contractAddress,
            amount: tierPrice.toString(),
            encodedData: approvalData,
          });

          // Prepare the approval transaction request
          const approvalRequest = {
            to: getContractAddresses().usdc,
            data: approvalData,
            value: "0",
            from: signerAddress,
            chainId: 10143, // Monad Testnet
          };

          // Set UI options for the approval transaction
          const approvalUiOptions = {
            description: `Approving ${ethers.formatUnits(
              tierPrice,
              usdcDecimals
            )} ${usdcSymbol} for deposit`,
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
          console.log("Waiting for approval confirmation...");
          const approvalReceipt = await ethersProvider.waitForTransaction(
            approvalTxHash.hash
          );
          console.log("Approval confirmed:", approvalReceipt);

          if (!approvalReceipt?.status) {
            throw new Error("USDC approval failed");
          }

          // Double check the allowance after approval
          const newAllowance = await usdcContract.allowance(
            signerAddress,
            contractAddress
          );
          console.log("New allowance after approval:", {
            allowance: newAllowance.toString(),
            requiredAmount: tierPrice.toString(),
            isEnough: newAllowance >= tierPrice,
          });

          if (newAllowance < tierPrice) {
            throw new Error("USDC approval did not increase allowance enough");
          }
        }

        // Log USDC contract details
        console.log("USDC contract details:", {
          address: usdcContract.target,
          decimals: usdcDecimals,
          symbol: usdcSymbol,
        });

        // Double check USDC balance right before transfer
        const finalBalance = await usdcContract.balanceOf(signerAddress);
        const finalAllowance = await usdcContract.allowance(
          signerAddress,
          contractAddress
        );

        console.log("Final USDC checks before transfer:", {
          balance: ethers.formatUnits(finalBalance, usdcDecimals),
          allowance: ethers.formatUnits(finalAllowance, usdcDecimals),
          transferAmount: ethers.formatUnits(tierPrice, usdcDecimals),
          from: signerAddress,
          to: contractAddress,
          hasEnoughBalance: finalBalance >= tierPrice,
          hasEnoughAllowance: finalAllowance >= tierPrice,
        });

        // Create contract interface for pool commit
        const poolInterface = new ethers.Interface(StageDotFunPoolABI);
        const commitData = poolInterface.encodeFunctionData("commitToTier", [
          tierId,
          tierPrice,
        ]);

        // Prepare the commit transaction request
        const commitRequest = {
          to: contractAddress,
          data: commitData,
          value: "0",
          from: signerAddress,
          chainId: 10143, // Monad Testnet
          gasLimit: 5000000, // Add gas limit for safety
        };

        // Set UI options for the commit transaction
        const commitUiOptions = {
          description: `Committing ${ethers.formatUnits(
            tierPrice,
            usdcDecimals
          )} ${usdcSymbol} to tier ${tierId}`,
          buttonText: "Confirm Commitment",
          transactionInfo: {
            title: "Pool Commitment",
            action: "Commit to Tier",
            contractInfo: {
              name: "StageDotFun Pool",
            },
          },
        };

        console.log("Sending commit transaction", {
          request: commitRequest,
          encodedData: commitData,
          functionSelector: commitData.slice(0, 10),
        });

        console.log("🔄 About to call Privy sendTransaction...");
        try {
          const txHash = await sendTransaction(commitRequest, {
            uiOptions: commitUiOptions,
          });

          console.log("Transaction hash received:", txHash);

          // Wait for transaction to be mined
          console.log("Waiting for transaction confirmation...");
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
              ...commitRequest,
              blockTag: receipt.blockNumber,
            });
            console.error("Transaction failed with code:", code);
            throw new Error("Transaction failed on chain");
          }

          // Create pool contract instance to parse logs
          const poolContract = getPoolContract(ethersProvider, contractAddress);

          try {
            // Look for TierCommitted event in the logs
            const commitEventSignature =
              poolContract.interface.getEvent("TierCommitted")?.topicHash;

            if (commitEventSignature) {
              const commitEvent = receipt.logs.find(
                (log) => log.topics[0] === commitEventSignature
              );

              if (!commitEvent) {
                console.warn(
                  "No TierCommitted event found in transaction logs"
                );
              } else {
                const parsedEvent = poolContract.interface.parseLog({
                  topics: commitEvent.topics,
                  data: commitEvent.data,
                });
                console.log(
                  "Found and parsed TierCommitted event:",
                  parsedEvent
                );
              }
            } else {
              console.warn(
                "Could not get TierCommitted event signature from contract interface"
              );
            }
          } catch (error) {
            console.warn("Error parsing TierCommitted event:", error);
            // Don't throw since the transaction itself succeeded
          }

          // Fetch updated pool details to confirm the commit
          const updatedPoolDetails = await poolContract.getPoolDetails();
          console.log(
            "Commit successful, updated pool details:",
            updatedPoolDetails
          );

          return {
            success: true,
            txHash: receipt.hash,
          };
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
      } catch (error) {
        console.error("Error in depositToPool:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    [user, getSigner, wallets, sendTransaction]
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
      const transferUiOptions = {
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

          const authUiOptions = {
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

        const withdrawUiOptions = {
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
          gasLimit: 3000000, // Increased gas limit for safety
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

  // Update pool name
  const updatePoolName = async (
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
      const receipt = await ethersProvider.waitForTransaction(txHash.hash);

      console.log("Pool name updated successfully:", {
        txHash: txHash.hash,
        receipt,
      });

      setIsLoading(false);
      return {
        success: true,
        txHash: txHash.hash,
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
  };

  // Update minimum commitment
  const updateMinCommitment = async (
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
      const receipt = await ethersProvider.waitForTransaction(txHash.hash);

      console.log("Min commitment updated successfully:", {
        txHash: txHash.hash,
        receipt,
      });

      setIsLoading(false);
      return {
        success: true,
        txHash: txHash.hash,
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
  };

  return {
    isLoading,
    error,
    createPool,
    createPoolWithDatabase,
    depositToPool,
    withdrawFromPool,
    updatePoolName,
    updateMinCommitment,
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
