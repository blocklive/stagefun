import { useState, useCallback } from "react";
import {
  usePrivy,
  useWallets,
  useSendTransaction,
  getAccessToken,
} from "@privy-io/react-auth";
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
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";
import { useSmartWallet } from "./useSmartWallet";
import showToast from "@/utils/toast";
import {
  ensureSmartWallet,
  validateSmartWallet,
  standardizeSmartWalletError,
} from "../lib/utils/smartWalletUtils";
import { MAX_SAFE_VALUE } from "@/lib/utils/contractValues";

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

// Define the interface for the API response data
interface PoolApiResponseData {
  id: string;
  // Add other fields returned by the API if needed by the frontend
  [key: string]: any;
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
    data?: PoolApiResponseData; // Add the pool data returned from API
  }>;
}

export function usePoolCreationContract(): PoolCreationHookResult {
  const { user, ready: privyReady, getAccessToken } = usePrivy();
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

        // Ensure smart wallet is available, with DB synchronization
        const loadingToast = showToast.loading("Preparing pool creation...");
        const smartWalletResult = await ensureSmartWallet(user, loadingToast);

        if (!smartWalletResult.success) {
          throw new Error(
            smartWalletResult.error ||
              "Smart wallet sync in progress, please retry"
          );
        }

        // Now that we've verified wallet exists, use the original smartWalletAddress from the hook
        if (!smartWalletAddress || !callContractFunction) {
          throw new Error(
            "Smart wallet functions not available. Please try again later."
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
        showToast.dismiss(loadingToast);

        return {
          receipt: result.receipt,
          poolAddress: result.poolAddress,
          lpTokenAddress: result.lpTokenAddress,
          transactionHash: result.transactionHash,
        };
      } catch (err: any) {
        console.error("Error creating pool:", err);

        // Use the standardized error message utility
        const errorMessage = err.message || "Error creating pool on chain";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        // If it's a smart wallet error (different from original), handle accordingly
        if (standardizedError !== errorMessage) {
          setError(standardizedError);
        } else {
          setError(errorMessage);
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, callContractFunction, getProvider, smartWalletAddress]
  );

  // Create a pool on the blockchain and then call the backend API
  const createPoolWithDatabase = useCallback(
    async (poolData: PoolCreationData, endTimeUnix: number) => {
      setIsLoading(true);
      setError(null);

      const loadingToast = showToast.loading("Preparing pool creation...");

      try {
        if (!user) {
          showToast.error("User not logged in", { id: loadingToast });
          throw new Error("User not logged in");
        }

        // Validate smart wallet is available using the new utility
        const walletValidation = await validateSmartWallet(
          user,
          loadingToast,
          smartWalletAddress || undefined,
          callContractFunction
        );

        if (!walletValidation.success) {
          throw new Error(walletValidation.error);
        }

        console.log(
          "Starting pool creation process (hook) with data:",
          poolData
        );

        // STEP 1: Create the pool on the blockchain (no change here)
        showToast.loading("Sending transaction to create pool...", {
          id: loadingToast,
        });
        let blockchainResult: BlockchainPoolResult;
        try {
          // Prepare tier data for the contract (values already in base units)
          const tierInitDataForContract =
            poolData.tiers?.map((tier) => {
              // Values are already in base units from formattedPoolData
              const priceBaseUnits = BigInt(tier.price);

              // Handle variable price tiers (minPrice/maxPrice)
              let minPriceBaseUnits = BigInt(0);
              let maxPriceBaseUnits = BigInt(0);

              if (tier.isVariablePrice) {
                // For minPrice, always convert normally
                minPriceBaseUnits = BigInt(tier.minPrice);

                // For maxPrice, check if it's MAX_SAFE_VALUE (uncapped price)
                if (tier.maxPrice === MAX_SAFE_VALUE) {
                  // Use the MAX_SAFE_VALUE for uncapped
                  maxPriceBaseUnits = BigInt(MAX_SAFE_VALUE);
                } else {
                  maxPriceBaseUnits = BigInt(tier.maxPrice);
                }
              }

              // Handle maxPatrons - check if it's MAX_SAFE_VALUE (uncapped patrons)
              let maxPatronsValue;
              if (tier.maxPatrons === MAX_SAFE_VALUE) {
                maxPatronsValue = BigInt(MAX_SAFE_VALUE);
              } else {
                maxPatronsValue = BigInt(tier.maxPatrons || 0);
              }

              console.log("Using tier price for contract:", {
                original: tier.price,
                converted: priceBaseUnits.toString(),
                isVariablePrice: tier.isVariablePrice,
                minPriceOriginal: tier.minPrice,
                minPriceConverted: minPriceBaseUnits.toString(),
                maxPriceOriginal: tier.maxPrice,
                maxPriceConverted: maxPriceBaseUnits.toString(),
                maxPatronsOriginal: tier.maxPatrons,
                maxPatronsConverted: maxPatronsValue.toString(),
                isMaxPriceUncapped: tier.maxPrice === MAX_SAFE_VALUE,
                isMaxPatronsUncapped: tier.maxPatrons === MAX_SAFE_VALUE,
              });

              return {
                name: tier.name,
                price: priceBaseUnits, // Already in base units
                nftMetadata: tier.nftMetadata || "",
                isVariablePrice: tier.isVariablePrice || false,
                minPrice: minPriceBaseUnits, // Already in base units
                maxPrice: maxPriceBaseUnits, // Already in base units or MAX_SAFE_VALUE
                maxPatrons: maxPatronsValue, // Already in base units or MAX_SAFE_VALUE
              };
            }) || [];

          // Target/cap amounts are already in base units from formattedPoolData
          const targetAmountBaseUnits = BigInt(poolData.target_amount);
          const capAmountBaseUnits =
            poolData.cap_amount === 0
              ? BigInt(0) // Use 0 to indicate no cap for the contract
              : poolData.cap_amount && poolData.cap_amount > 0
              ? BigInt(poolData.cap_amount)
              : targetAmountBaseUnits; // Use target amount if cap not specified

          console.log("Pool creation cap settings:", {
            rawCap: poolData.cap_amount,
            isNoCap: poolData.cap_amount === 0,
            capAmountBaseUnits: capAmountBaseUnits.toString(),
            targetAmountBaseUnits: targetAmountBaseUnits.toString(),
          });

          blockchainResult = await createPool(
            poolData.name,
            poolData.id, // uniqueId
            poolData.token_symbol, // ticker is used as symbol
            endTimeUnix,
            Number(targetAmountBaseUnits), // Pass base units to contract
            Number(capAmountBaseUnits), // Pass base units to contract
            // Map tier data again, ensuring correct types
            tierInitDataForContract.map((tier) => {
              // First convert everything to string to avoid overflow issues
              const maxPriceStr = tier.maxPrice.toString();
              const maxPatronsStr = tier.maxPatrons.toString();

              // Handle special MAX_SAFE_VALUE values differently
              const maxPriceNum =
                maxPriceStr === MAX_SAFE_VALUE
                  ? Number.MAX_SAFE_INTEGER // Use MAX_SAFE_INTEGER as a safe alternative
                  : Number(tier.maxPrice);

              const maxPatronsNum =
                maxPatronsStr === MAX_SAFE_VALUE
                  ? Number.MAX_SAFE_INTEGER // Use MAX_SAFE_INTEGER as a safe alternative
                  : Number(tier.maxPatrons);

              console.log("Final tier values for contract:", {
                name: tier.name,
                price: Number(tier.price),
                minPrice: Number(tier.minPrice),
                maxPrice: maxPriceNum,
                maxPatrons: maxPatronsNum,
                isUncappedPrice: maxPriceStr === MAX_SAFE_VALUE,
                isUncappedPatrons: maxPatronsStr === MAX_SAFE_VALUE,
              });

              return {
                name: tier.name,
                price: Number(tier.price),
                nftMetadata: tier.nftMetadata || "",
                isVariablePrice: tier.isVariablePrice || false,
                minPrice: Number(tier.minPrice),
                maxPrice: maxPriceNum,
                maxPatrons: maxPatronsNum,
              };
            })
          );

          console.log(
            "Pool created successfully on blockchain:",
            blockchainResult
          );
          showToast.loading("Blockchain transaction confirmed.", {
            id: loadingToast,
          });
        } catch (blockchainError: any) {
          console.error("Error creating pool on blockchain:", blockchainError);
          const message =
            blockchainError?.shortMessage ??
            blockchainError.message ??
            "Unknown blockchain error";
          showToast.error(`Blockchain Error: ${message}`, { id: loadingToast });
          // Attempt to extract revert reason if available
          let reason = "Blockchain transaction failed.";
          if (blockchainError.reason) {
            reason = `Blockchain Error: ${blockchainError.reason}`;
          } else if (blockchainError.data?.message) {
            reason = `Blockchain Error: ${blockchainError.data.message}`;
          } else if (typeof blockchainError.toString === "function") {
            const errString = blockchainError.toString();
            const revertMatch = errString.match(/execution reverted: ([^"]*)/);
            if (revertMatch && revertMatch[1]) {
              reason = `Blockchain Error: ${revertMatch[1]}`;
            }
          }

          return {
            success: false,
            error: reason, // Return extracted reason
          };
        }

        // STEP 2: Call the backend API to save data to the database
        showToast.remove();
        showToast.loading("Synchronizing pool...", {
          id: loadingToast,
        });
        console.log("Calling backend API to save pool data:", {
          poolData,
          endTimeUnix,
          blockchainResult,
        });

        let authToken;
        try {
          authToken = await getAccessToken();
          if (!authToken) {
            throw new Error("Could not retrieve authentication token.");
          }
        } catch (tokenError: any) {
          console.error("Error getting auth token:", tokenError);
          showToast.error("Authentication error. Please log in again.", {
            id: loadingToast,
          });
          return { success: false, error: "Authentication error." };
        }

        try {
          const response = await fetch("/api/pools/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              poolData, // Send original poolData (API handles conversions if needed)
              endTimeUnix,
              blockchainResult,
            }),
          });

          const apiResponse = await response.json();

          if (!response.ok) {
            console.error("API Error Response:", apiResponse);
            throw new Error(
              apiResponse.error ||
                `API request failed with status ${response.status}`
            );
          }

          if (!apiResponse.success) {
            console.error("API returned success=false:", apiResponse);
            throw new Error(apiResponse.error || "API operation failed");
          }

          console.log(
            "Pool synchronized successfully via API:",
            apiResponse.data
          );
          showToast.success("Pool created successfully! 🎉", {
            id: loadingToast,
          });

          return {
            success: true,
            data: apiResponse.data, // Return the pool data from API response
            poolAddress: blockchainResult.poolAddress,
            txHash: blockchainResult.transactionHash,
          };
        } catch (apiError: any) {
          console.error("Error calling create pool API:", apiError);
          showToast.error(`Failed to save pool data: ${apiError.message}`, {
            id: loadingToast,
          });
          // Note: Pool exists on-chain but DB failed. May need manual reconciliation or retry logic.
          return {
            success: false,
            error: `Pool created on blockchain, but failed to save to server: ${apiError.message}`,
            txHash: blockchainResult.transactionHash, // Still return hash if available
            poolAddress: blockchainResult.poolAddress,
          };
        }
      } catch (error: any) {
        console.error("Error in createPoolWithDatabase:", error);

        // Use the standardized error message utility
        const errorMessage = error.message || "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        // If it's a smart wallet error (different from original), handle accordingly
        if (standardizedError !== errorMessage) {
          setError(standardizedError);
          showToast.error(standardizedError, { id: loadingToast });
          return { success: false, error: standardizedError };
        }

        setError(errorMessage);
        showToast.error(errorMessage, { id: loadingToast });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    // Include smartWalletAddress in dependencies to match what we're checking
    [user, createPool, getAccessToken, smartWalletAddress]
  );

  return {
    isLoading: isLoading || smartWalletIsLoading,
    error,
    createPool,
    createPoolWithDatabase,
  };
}
