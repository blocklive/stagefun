import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { useSmartWallet } from "./useSmartWallet";
import { StageDotFunPoolABI } from "../lib/contracts/StageDotFunPool";
import {
  MAX_SAFE_VALUE,
  safeToUSDCBaseUnits,
} from "@/lib/utils/contractValues";
import showToast from "@/utils/toast";
import {
  ensureSmartWallet,
  validateSmartWallet,
  standardizeSmartWalletError,
} from "../lib/utils/smartWalletUtils";

// Define the tier data interface
export interface TierUpdateData {
  // Database identifier (UUID string, optional for new tiers)
  dbId?: string;
  // On-chain tier index (numeric index in the contract)
  onchainIndex: number;
  // Tier properties
  name: string;
  price: number;
  description: string;
  nftMetadata: string;
  isVariablePrice: boolean;
  minPrice: number;
  maxPrice: number;
  maxPatrons: number;
  isActive: boolean;
  imageUrl?: string;
  // Reward items array
  rewardItems?: string[];
  // Full reward objects with all details
  fullRewards?: any[];
}

// Define the result interface
export interface TierUpdateResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function usePoolTierUpdate() {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { callContractFunction, smartWalletAddress } = useSmartWallet();
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

  // Update an existing tier
  const updateTier = useCallback(
    async (
      poolAddress: string,
      onchainIndex: number,
      tierData: TierUpdateData
    ): Promise<TierUpdateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        // Validate smart wallet is available
        const walletValidation = await validateSmartWallet(
          user,
          undefined, // No toast ID needed since we're not showing toasts here
          smartWalletAddress || undefined,
          callContractFunction
        );

        if (!walletValidation.success) {
          throw new Error(walletValidation.error);
        }

        console.log(
          `Starting tier update process for pool: ${poolAddress}, onchainIndex: ${onchainIndex}`
        );

        // Convert prices to contract format (base units)
        const priceBaseUnits = BigInt(Math.floor(tierData.price * 1000000));
        let minPriceBaseUnits = BigInt(0);
        let maxPriceBaseUnits = BigInt(0);

        if (tierData.isVariablePrice) {
          minPriceBaseUnits = BigInt(Math.floor(tierData.minPrice * 1000000));
          // For uncapped variable price, use safeToUSDCBaseUnits to ensure consistency
          maxPriceBaseUnits =
            String(tierData.maxPrice) === MAX_SAFE_VALUE
              ? safeToUSDCBaseUnits(MAX_SAFE_VALUE, true)
              : BigInt(Math.floor(tierData.maxPrice * 1000000));
        }

        // For unlimited patrons, use 0
        const maxPatronsValue = tierData.maxPatrons
          ? BigInt(tierData.maxPatrons)
          : BigInt(0);

        // Prepare the updateTier function parameters
        const updateTierParams = [
          onchainIndex, // Use explicitly provided on-chain index
          tierData.name,
          priceBaseUnits,
          tierData.nftMetadata || "",
          tierData.isVariablePrice,
          minPriceBaseUnits,
          maxPriceBaseUnits,
          maxPatronsValue,
        ];

        console.log("Updating tier with parameters:", {
          onchainIndex,
          name: tierData.name,
          price: priceBaseUnits.toString(),
          nftMetadata: tierData.nftMetadata || "",
          isVariablePrice: tierData.isVariablePrice,
          minPrice: minPriceBaseUnits.toString(),
          maxPrice: maxPriceBaseUnits.toString(),
          maxPatrons: maxPatronsValue.toString(),
        });

        // Use callContractFunction instead of sendTransaction for consistent pattern
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "updateTier",
          updateTierParams,
          `Updating tier "${tierData.name}"`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update tier");
        }

        console.log("Tier update transaction sent:", result.txHash);

        // Wait for transaction to be mined
        const provider = await getProvider();
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        // Verify transaction was successful
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        console.log("Tier updated successfully:", {
          txHash: result.txHash,
          receipt,
        });

        setIsLoading(false);

        return {
          success: true,
          txHash: result.txHash as string,
        };
      } catch (error: any) {
        console.error("Error updating tier:", error);

        // Standardize error message
        const errorMessage = error.message || "Error updating tier";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        setIsLoading(false);
        return {
          success: false,
          error: standardizedError,
        };
      }
    },
    [
      user,
      walletsReady,
      wallets,
      getProvider,
      smartWalletAddress,
      callContractFunction,
    ]
  );

  // Create a new tier
  const createTier = useCallback(
    async (
      poolAddress: string,
      tierData: TierUpdateData
    ): Promise<TierUpdateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        // Validate smart wallet is available
        const walletValidation = await validateSmartWallet(
          user,
          undefined, // No toast ID needed
          smartWalletAddress || undefined,
          callContractFunction
        );

        if (!walletValidation.success) {
          throw new Error(walletValidation.error);
        }

        console.log(`Starting tier creation process for pool: ${poolAddress}`);

        // Convert prices to contract format (base units)
        const priceBaseUnits = BigInt(Math.floor(tierData.price * 1000000));
        let minPriceBaseUnits = BigInt(0);
        let maxPriceBaseUnits = BigInt(0);

        if (tierData.isVariablePrice) {
          minPriceBaseUnits = BigInt(Math.floor(tierData.minPrice * 1000000));
          // For uncapped variable price, use safeToUSDCBaseUnits to ensure consistency
          maxPriceBaseUnits =
            String(tierData.maxPrice) === MAX_SAFE_VALUE
              ? safeToUSDCBaseUnits(MAX_SAFE_VALUE, true)
              : BigInt(Math.floor(tierData.maxPrice * 1000000));
        }

        // For unlimited patrons, use 0
        const maxPatronsValue = tierData.maxPatrons
          ? BigInt(tierData.maxPatrons)
          : BigInt(0);

        // Prepare the createTier function parameters
        const createTierParams = [
          tierData.name,
          priceBaseUnits,
          tierData.nftMetadata || "",
          tierData.isVariablePrice,
          minPriceBaseUnits,
          maxPriceBaseUnits,
          maxPatronsValue,
        ];

        console.log("Creating tier with parameters:", {
          name: tierData.name,
          price: priceBaseUnits.toString(),
          nftMetadata: tierData.nftMetadata || "",
          isVariablePrice: tierData.isVariablePrice,
          minPrice: minPriceBaseUnits.toString(),
          maxPrice: maxPriceBaseUnits.toString(),
          maxPatrons: maxPatronsValue.toString(),
        });

        // Use callContractFunction instead of sendTransaction for consistent pattern
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "createTier",
          createTierParams,
          `Creating new tier "${tierData.name}"`
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to create tier");
        }

        console.log("Tier creation transaction sent:", result.txHash);

        // Wait for transaction to be mined
        const provider = await getProvider();
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        // Verify transaction was successful
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        console.log("Tier created successfully:", {
          txHash: result.txHash,
          receipt,
        });

        setIsLoading(false);

        return {
          success: true,
          txHash: result.txHash as string,
        };
      } catch (error: any) {
        console.error("Error creating tier:", error);

        // Standardize error message
        const errorMessage = error.message || "Error creating tier";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        setIsLoading(false);
        return {
          success: false,
          error: standardizedError,
        };
      }
    },
    [
      user,
      walletsReady,
      wallets,
      getProvider,
      smartWalletAddress,
      callContractFunction,
    ]
  );

  // Deactivate a tier
  const deactivateTier = useCallback(
    async (
      poolAddress: string,
      onchainIndex: number
    ): Promise<TierUpdateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        // Validate smart wallet is available
        const walletValidation = await validateSmartWallet(
          user,
          undefined, // No toast ID needed
          smartWalletAddress || undefined,
          callContractFunction
        );

        if (!walletValidation.success) {
          throw new Error(walletValidation.error);
        }

        console.log(
          `Starting tier deactivation process for pool: ${poolAddress}, onchainIndex: ${onchainIndex}`
        );

        // Use callContractFunction instead of sendTransaction for consistent pattern
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "deactivateTier",
          [onchainIndex], // Use onchainIndex explicitly
          "Deactivating tier"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to deactivate tier");
        }

        console.log("Tier deactivation transaction sent:", result.txHash);

        // Wait for transaction to be mined
        const provider = await getProvider();
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        // Verify transaction was successful
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        console.log("Tier deactivated successfully:", {
          txHash: result.txHash,
          receipt,
        });

        setIsLoading(false);

        return {
          success: true,
          txHash: result.txHash as string,
        };
      } catch (error: any) {
        console.error("Error deactivating tier:", error);

        // Standardize error message
        const errorMessage = error.message || "Error deactivating tier";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        setIsLoading(false);
        return {
          success: false,
          error: standardizedError,
        };
      }
    },
    [
      user,
      walletsReady,
      wallets,
      getProvider,
      smartWalletAddress,
      callContractFunction,
    ]
  );

  // Activate a tier
  const activateTier = useCallback(
    async (
      poolAddress: string,
      onchainIndex: number
    ): Promise<TierUpdateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("User not logged in");
        }

        // Validate smart wallet is available
        const walletValidation = await validateSmartWallet(
          user,
          undefined, // No toast ID needed
          smartWalletAddress || undefined,
          callContractFunction
        );

        if (!walletValidation.success) {
          throw new Error(walletValidation.error);
        }

        console.log(
          `Starting tier activation process for pool: ${poolAddress}, onchainIndex: ${onchainIndex}`
        );

        // Use callContractFunction instead of sendTransaction for consistent pattern
        const result = await callContractFunction(
          poolAddress as `0x${string}`,
          StageDotFunPoolABI,
          "activateTier",
          [onchainIndex], // Use onchainIndex explicitly
          "Activating tier"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to activate tier");
        }

        console.log("Tier activation transaction sent:", result.txHash);

        // Wait for transaction to be mined
        const provider = await getProvider();
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        // Verify transaction was successful
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        console.log("Tier activated successfully:", {
          txHash: result.txHash,
          receipt,
        });

        setIsLoading(false);

        return {
          success: true,
          txHash: result.txHash as string,
        };
      } catch (error: any) {
        console.error("Error activating tier:", error);

        // Standardize error message
        const errorMessage = error.message || "Error activating tier";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        setIsLoading(false);
        return {
          success: false,
          error: standardizedError,
        };
      }
    },
    [
      user,
      walletsReady,
      wallets,
      getProvider,
      smartWalletAddress,
      callContractFunction,
    ]
  );

  return {
    updateTier,
    createTier,
    deactivateTier,
    activateTier,
    isLoading,
    error,
  };
}
