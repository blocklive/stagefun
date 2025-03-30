import { useState, useCallback } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import type {
  UnsignedTransactionRequest,
  SendTransactionModalUIOptions,
} from "@privy-io/react-auth";
import { ethers } from "ethers";
import { createPoolWithSmartWallet } from "../lib/services/contract-service";
import {
  toUSDCBaseUnits,
  StageDotFunPoolFactoryABI,
  StageDotFunPoolABI,
} from "../lib/contracts/StageDotFunPool";
import { supabase } from "../lib/supabase";
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";
import { useSmartWallet } from "./useSmartWallet";
import {
  PoolCreationService,
  CreatePoolResult,
} from "../lib/services/blockchain/pool-creation.service";
import showToast from "@/utils/toast";

// Define the interface for pool creation data
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

export interface PoolCreationHookResult {
  isLoading: boolean;
  error: string | null;
  createPool: (
    name: string,
    uniqueId: string,
    symbol: string,
    endTime: number,
    targetAmount: number,
    capAmount: number,
    tiers: {
      name: string;
      price: number;
      nftMetadata: string;
      isVariablePrice: boolean;
      minPrice: number;
      maxPrice: number;
      maxPatrons: number;
    }[]
  ) => Promise<{
    receipt: ethers.TransactionReceipt;
    poolAddress: string;
    lpTokenAddress: string;
    transactionHash: string;
  }>;
  createPoolWithDatabase: (
    poolData: any,
    endTimeUnix: number
  ) => Promise<{
    success: boolean;
    error?: string;
    poolAddress?: string;
    txHash?: string;
  }>;
}

export function usePoolCreationContract(): PoolCreationHookResult {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const {
    callContractFunction,
    smartWalletAddress,
    isLoading: smartWalletIsLoading,
  } = useSmartWallet();
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
  const createPool = useCallback(
    async (
      name: string,
      uniqueId: string,
      symbol: string,
      endTime: number,
      targetAmount: number,
      capAmount: number,
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

        if (!smartWalletAddress) {
          throw new Error(
            "Smart wallet not available. Please contact support."
          );
        }

        console.log(
          "Starting pool creation process with smart wallet for:",
          name
        );

        // Prepare tier data for the contract
        const tierInitData = tiers.map((tier) => ({
          name: tier.name,
          price: BigInt(tier.price), // Already in USDC base units
          nftMetadata: tier.nftMetadata || "",
          isVariablePrice: tier.isVariablePrice || false,
          minPrice: tier.isVariablePrice ? BigInt(tier.minPrice) : BigInt(0),
          maxPrice: tier.isVariablePrice ? BigInt(tier.maxPrice) : BigInt(0),
          maxPatrons: BigInt(tier.maxPatrons || 0),
        }));

        // Use the contract service's smart wallet implementation with type assertions
        const result = await createPoolWithSmartWallet(
          callContractFunction as any,
          getProvider as any,
          smartWalletAddress as `0x${string}`,
          name,
          uniqueId,
          symbol,
          BigInt(endTime),
          BigInt(targetAmount),
          BigInt(capAmount),
          tierInitData
        );

        console.log("Pool creation completed successfully:", result);

        return {
          receipt: result.receipt,
          poolAddress: result.poolAddress,
          lpTokenAddress: result.lpTokenAddress,
          transactionHash: result.transactionHash,
        };
      } catch (err: any) {
        console.error("Error creating pool:", err);
        setError(err.message || "Error creating pool on chain");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, smartWalletAddress, callContractFunction, getProvider]
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
      const loadingToast = showToast.loading(
        "Creating pool on the blockchain."
      );

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        if (!smartWalletAddress) {
          throw new Error(
            "Smart wallet not available. Please contact support."
          );
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
            poolData.cap_amount && poolData.cap_amount > 0
              ? Number(toUSDCBaseUnits(poolData.cap_amount))
              : Number(toUSDCBaseUnits(poolData.target_amount)), // Use target amount as cap if not specified or is 0
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
          showToast.error(
            blockchainError.message || "Unknown blockchain error",
            {
              id: loadingToast,
            }
          );
          return {
            success: false,
            error: blockchainError.message || "Unknown blockchain error",
          };
        }

        // STEP 2: Now that blockchain creation succeeded, add to database
        showToast.loading("Synchronizing pool data...", { id: loadingToast });
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
          showToast.error(
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
          showToast.loading("Preparing tiers and rewards...", {
            id: loadingToast,
          });
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
            showToast.error("Pool was created but tiers failed to save", {
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
            showToast.error(rewardResult.error || "Failed to process rewards", {
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
        showToast.success("Pool created successfully! 🎉", {
          id: loadingToast,
        });
        return {
          success: true,
          data: insertedPool,
          poolAddress: blockchainResult.poolAddress,
          txHash: blockchainResult.transactionHash,
        };
      } catch (err: any) {
        console.error("Error in createPoolWithDatabase:", err);
        setError(err.message || "Error creating pool");
        showToast.error(err.message || "Error creating pool", {
          id: loadingToast,
        });
        return {
          success: false,
          error: err.message || "Unknown error in pool creation process",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user, createPool, smartWalletAddress]
  );

  return {
    isLoading: isLoading || smartWalletIsLoading,
    error,
    createPool,
    createPoolWithDatabase,
  };
}
