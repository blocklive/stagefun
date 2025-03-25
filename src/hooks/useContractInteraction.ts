import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import type {
  UnsignedTransactionRequest,
  SendTransactionModalUIOptions,
} from "@privy-io/react-auth";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  createPoolOnChain,
  getPoolFromChain,
  getPoolLpHoldersFromChain,
  getUserPoolBalanceFromChain,
  getUSDCBalance,
} from "../lib/services/contract-service";
import {
  ContractPool,
  toUSDCBaseUnits,
} from "../lib/contracts/StageDotFunPool";
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
  getPoolDetails,
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
    minCommitment: number,
    tiers: {
      name: string;
      price: number;
      nftMetadata: string;
      isVariablePrice: boolean;
      minPrice: number;
      maxPrice: number;
      maxPatrons: number;
    }[]
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
      minCommitment: number,
      tiers: {
        name: string;
        price: number;
        nftMetadata: string;
        isVariablePrice: boolean;
        minPrice: number;
        maxPrice: number;
        maxPatrons: number;
      }[]
    ) => {
      setError(null);
      setIsLoading(true);

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
          minCommitment,
          "tiers:",
          tiers
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

        // Convert target amount to USDC base units (6 decimals)
        const targetAmountBigInt = BigInt(targetAmount); // Already in USDC base units from createPoolWithDatabase
        const capAmountBigInt = BigInt(targetAmount); // Already in USDC base units from createPoolWithDatabase

        // Convert tiers to the format expected by the contract
        const tierInitData = tiers.map((tier) => ({
          name: tier.name,
          price: BigInt(tier.price), // Already in USDC base units from createPoolWithDatabase
          nftMetadata: tier.nftMetadata || "",
          isVariablePrice: tier.isVariablePrice || false,
          minPrice: tier.isVariablePrice ? BigInt(tier.minPrice) : BigInt(0),
          maxPrice: tier.isVariablePrice ? BigInt(tier.maxPrice) : BigInt(0),
          maxPatrons: BigInt(tier.maxPatrons || 0),
        }));

        console.log("Creating pool with parameters:", {
          name,
          uniqueId,
          symbol,
          endTime,
          targetAmount: targetAmountBigInt.toString(),
          signerAddress: await signer.getAddress(),
          tiers: tierInitData.map((t) => ({
            ...t,
            price: t.price.toString(),
            minPrice: t.minPrice.toString(),
            maxPrice: t.maxPrice.toString(),
            maxPatrons: t.maxPatrons.toString(),
          })),
        });

        // Use createPoolOnChain from the contract service
        const result = await createPoolOnChain(
          signer,
          name,
          uniqueId,
          symbol,
          BigInt(endTime),
          targetAmountBigInt,
          capAmountBigInt,
          tierInitData
        );

        console.log("Pool creation transaction confirmed:", result.receipt);

        if (!result.receipt) {
          throw new Error("Transaction failed");
        }

        // Create the pool object from the result
        const pool: ContractPool = {
          name,
          uniqueId,
          creator: await signer.getAddress(),
          totalDeposits: BigInt(0),
          revenueAccumulated: BigInt(0),
          endTime: BigInt(endTime),
          targetAmount: targetAmountBigInt,
          capAmount: capAmountBigInt,
          status: 1, // ACTIVE status
          lpTokenAddress: result.lpTokenAddress,
          nftContractAddress: ethers.ZeroAddress, // Will be set when NFT contract is deployed
          tierCount: BigInt(tiers.length),
          minCommitment: BigInt(0),
          lpHolders: [],
          milestones: [],
          emergencyMode: false,
          emergencyWithdrawalRequestTime: BigInt(0),
          authorizedWithdrawer: ethers.ZeroAddress,
        };

        console.log("Pool details:", {
          name: pool.name,
          uniqueId: pool.uniqueId,
          creator: pool.creator,
          totalDeposits: pool.totalDeposits.toString(),
          revenueAccumulated: pool.revenueAccumulated.toString(),
          endTime: pool.endTime.toString(),
          targetAmount: pool.targetAmount.toString(),
          capAmount: pool.capAmount.toString(),
          status: pool.status,
          lpTokenAddress: pool.lpTokenAddress,
          tierCount: pool.tierCount.toString(),
        });

        return {
          receipt: result.receipt,
          poolAddress: result.poolId,
          lpTokenAddress: result.lpTokenAddress,
          transactionHash: result.receipt.hash,
        };
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

      // Initialize loading toast
      const loadingToast = toast.loading(
        "Creating your pool on the blockchain..."
      );

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        console.log("Starting pool creation process with data:", poolData);

        // STEP 1: First create the pool on the blockchain
        let blockchainResult: BlockchainPoolResult;
        try {
          // Convert tiers to the format expected by the contract
          const tierInitData =
            poolData.tiers?.map((tier) => {
              // Convert price to USDC base units (6 decimals)
              const price = toUSDCBaseUnits(Number(tier.price));
              console.log("Converting tier price:", {
                original: tier.price,
                converted: price.toString(),
                expected: (Number(tier.price) * 1e6).toString(),
                isVariablePrice: tier.isVariablePrice,
                minPrice: tier.minPrice,
                maxPrice: tier.maxPrice,
              });

              return {
                name: tier.name,
                price,
                nftMetadata: tier.nftMetadata || "",
                isVariablePrice: tier.isVariablePrice || false,
                minPrice: tier.isVariablePrice
                  ? toUSDCBaseUnits(Number(tier.minPrice))
                  : BigInt(0),
                maxPrice: tier.isVariablePrice
                  ? toUSDCBaseUnits(Number(tier.maxPrice))
                  : BigInt(0),
                maxPatrons: BigInt(tier.maxPatrons || 0),
              };
            }) || [];

          blockchainResult = await createPool(
            poolData.name,
            poolData.id,
            poolData.token_symbol,
            endTimeUnix,
            Number(toUSDCBaseUnits(poolData.target_amount)), // Convert to USDC base units (6 decimals)
            poolData.cap_amount
              ? Number(toUSDCBaseUnits(poolData.cap_amount))
              : Number(toUSDCBaseUnits(poolData.target_amount)), // Use target amount as cap if not specified
            tierInitData.map((tier) => ({
              ...tier,
              price: Number(tier.price), // Already in USDC base units
              minPrice: tier.isVariablePrice ? Number(tier.minPrice) : 0,
              maxPrice: tier.isVariablePrice ? Number(tier.maxPrice) : 0,
              maxPatrons: Number(tier.maxPatrons),
            }))
          );

          console.log(
            "Pool created successfully on blockchain:",
            blockchainResult
          );
        } catch (blockchainError: any) {
          console.error("Error creating pool on blockchain:", blockchainError);
          toast.error(blockchainError.message || "Unknown blockchain error", {
            id: loadingToast,
          });
          return {
            success: false,
            error: blockchainError.message || "Unknown blockchain error",
          };
        }

        // STEP 2: Now that blockchain creation succeeded, add to database
        toast.loading("Synchronizing pool data...", { id: loadingToast });
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
          toast.error(
            "Pool was created on blockchain but database entry failed",
            { id: loadingToast }
          );
          return {
            success: false,
            error: "Pool was created on blockchain but database entry failed",
            txHash: blockchainResult.transactionHash,
          };
        }

        // Create tiers in database first
        if (tiers && tiers.length > 0) {
          toast.loading("Preparing tiers and rewards...", { id: loadingToast });
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
            toast.error("Pool was created but tiers failed to save", {
              id: loadingToast,
            });
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
            toast.error(rewardResult.error || "Failed to process rewards", {
              id: loadingToast,
            });
            return {
              success: false,
              error: rewardResult.error || "Failed to process rewards",
              txHash: blockchainResult.transactionHash,
            };
          }
        }

        console.log("Pool created successfully in database:", insertedPool);
        toast.success("Pool created successfully! 🎉", { id: loadingToast });
        return {
          success: true,
          data: insertedPool,
          txHash: blockchainResult.transactionHash,
        };
      } catch (err: any) {
        console.error("Error in createPoolWithDatabase:", err);
        setError(err.message || "Error creating pool");
        toast.error(err.message || "Error creating pool", { id: loadingToast });
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
          tokenId
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

  return {
    isLoading,
    error,
    createPool,
    createPoolWithDatabase,
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
