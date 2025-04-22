import { useState, useCallback } from "react";
import {
  usePoolTierUpdate,
  TierUpdateData,
  TierUpdateResult,
} from "./usePoolTierUpdate";
import showToast from "@/utils/toast";
import { useRouter } from "next/navigation";
import { useAuthJwt } from "@/hooks/useAuthJwt";

interface TierManagerParams {
  poolId: string;
  contractAddress: string;
  onSuccess?: () => void;
}

interface TierManagerResult {
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updateTier: (tier: TierUpdateData) => Promise<boolean>;
  createTier: (tier: TierUpdateData) => Promise<boolean>;
  toggleTierStatus: (tier: TierUpdateData) => Promise<boolean>;
}

export function useTierManagement({
  poolId,
  contractAddress,
  onSuccess,
}: TierManagerParams): TierManagerResult {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token: authJwt, refreshToken } = useAuthJwt();

  // Use the on-chain update hook
  const {
    updateTier: updateTierOnChain,
    createTier: createTierOnChain,
    activateTier: activateTierOnChain,
    deactivateTier: deactivateTierOnChain,
    isLoading: isContractLoading,
    error: contractError,
  } = usePoolTierUpdate();

  // Update an existing tier (on-chain first, then database)
  const updateTier = useCallback(
    async (
      tier: TierUpdateData,
      existingToastId?: string
    ): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      // Create a loading toast that we'll update throughout the process, or use existing one
      const loadingToast =
        existingToastId || showToast.loading(`Updating tier "${tier.name}"...`);

      try {
        // First update on-chain
        console.log("Starting tier update process:", {
          poolId,
          contractAddress,
          dbId: tier.dbId,
          onchainIndex: tier.onchainIndex,
          tier,
        });

        // Update toast to show blockchain transaction status
        showToast.loading("Updating tier data...", {
          id: loadingToast,
        });

        const onChainResult = await updateTierOnChain(
          contractAddress,
          tier.onchainIndex, // Explicitly use on-chain index for blockchain
          tier
        );

        if (!onChainResult.success) {
          throw new Error(
            onChainResult.error || "Failed to update tier on-chain"
          );
        }

        console.log("On-chain tier update successful:", {
          txHash: onChainResult.txHash,
        });

        // Now update the database via API
        showToast.loading("Saving tier changes to database...", {
          id: loadingToast,
        });

        // Format tier data for API - explicitly using database ID
        const tierUpdatePayload = {
          id: tier.dbId, // Use renamed dbId field for database operations
          name: tier.name,
          description: tier.description || "",
          price: tier.price,
          is_variable_price: tier.isVariablePrice,
          min_price: tier.minPrice || 0,
          max_price: tier.maxPrice || 0,
          max_supply: tier.maxPatrons || 0,
          is_active: tier.isActive,
          image_url: tier.imageUrl,
          nft_metadata: tier.nftMetadata || "",
          onchain_index: tier.onchainIndex, // Include on-chain index for clarity
        };

        // Get JWT token for API call
        let jwt = authJwt;
        if (!jwt) {
          jwt = await refreshToken();
        }

        if (!jwt) {
          throw new Error("Authentication error. Please try again.");
        }

        // Call the API to update the database
        const response = await fetch("/api/pools/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            poolId,
            tierUpdates: [tierUpdatePayload],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update tier in database");
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Refresh the page data to show the updates
        router.refresh();

        return true;
      } catch (error) {
        console.error("Error in updateTier:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error updating tier";
        setError(errorMessage);
        showToast.error(errorMessage, { id: loadingToast });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [
      poolId,
      contractAddress,
      updateTierOnChain,
      router,
      onSuccess,
      authJwt,
      refreshToken,
    ]
  );

  // Create a new tier (on-chain first, then database)
  const createTier = useCallback(
    async (tier: TierUpdateData): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      // Create a loading toast that we'll update throughout the process
      const loadingToast = showToast.loading(
        `Creating new tier "${tier.name}"...`
      );

      try {
        // First create on-chain
        console.log("Starting tier creation process:", {
          poolId,
          contractAddress,
          tier,
        });

        // Update toast for blockchain operation
        showToast.loading("Creating tier on-chain...", {
          id: loadingToast,
        });

        const onChainResult = await createTierOnChain(contractAddress, tier);

        if (!onChainResult.success) {
          throw new Error(
            onChainResult.error || "Failed to create tier on-chain"
          );
        }

        console.log("On-chain tier creation successful:", {
          txHash: onChainResult.txHash,
        });

        // Now update the database via API
        showToast.loading("Saving tier to database...", {
          id: loadingToast,
        });

        // Format tier data for API
        const tierCreatePayload = {
          // No ID for new tiers
          name: tier.name,
          description: tier.description || "",
          price: tier.price,
          is_variable_price: tier.isVariablePrice,
          min_price: tier.minPrice || 0,
          max_price: tier.maxPrice || 0,
          max_supply: tier.maxPatrons || 0,
          is_active: tier.isActive,
          image_url: tier.imageUrl,
          nft_metadata: tier.nftMetadata || "",
          onchain_index: tier.onchainIndex, // Include the on-chain index
        };

        // Get JWT token for API call
        let jwt = authJwt;
        if (!jwt) {
          jwt = await refreshToken();
        }

        if (!jwt) {
          throw new Error("Authentication error. Please try again.");
        }

        // Call the API to update the database
        const response = await fetch("/api/pools/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            poolId,
            tierUpdates: [tierCreatePayload],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save tier to database");
        }

        // Success!
        showToast.success(`Tier "${tier.name}" created successfully!`, {
          id: loadingToast,
        });

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Refresh the page data to show the updates
        router.refresh();

        return true;
      } catch (error) {
        console.error("Error in createTier:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error creating tier";
        setError(errorMessage);
        showToast.error(errorMessage, { id: loadingToast });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [
      poolId,
      contractAddress,
      createTierOnChain,
      router,
      onSuccess,
      authJwt,
      refreshToken,
    ]
  );

  // Toggle tier status (activate/deactivate)
  const toggleTierStatus = useCallback(
    async (tier: TierUpdateData): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      const action = tier.isActive ? "Deactivating" : "Activating";
      const loadingToast = showToast.loading(
        `${action} tier "${tier.name}"...`
      );

      try {
        // First update on-chain
        console.log(`${action} tier on-chain:`, {
          poolId,
          contractAddress,
          dbId: tier.dbId,
          onchainIndex: tier.onchainIndex,
          currentStatus: tier.isActive,
        });

        // Update the toast for blockchain operation
        showToast.loading(`${action} tier on-chain...`, {
          id: loadingToast,
        });

        // Call appropriate function based on desired state
        const onChainResult = tier.isActive
          ? await deactivateTierOnChain(contractAddress, tier.onchainIndex)
          : await activateTierOnChain(contractAddress, tier.onchainIndex);

        if (!onChainResult.success) {
          throw new Error(
            onChainResult.error ||
              `Failed to ${action.toLowerCase()} tier on-chain`
          );
        }

        console.log(`On-chain tier ${action.toLowerCase()} successful:`, {
          txHash: onChainResult.txHash,
        });

        // Now update the database via API
        showToast.loading(`Updating tier status in database...`, {
          id: loadingToast,
        });

        // Format tier data for API with updated status
        const tierUpdatePayload = {
          id: tier.dbId, // Use renamed dbId field for database operations
          name: tier.name,
          description: tier.description || "",
          price: tier.price,
          is_variable_price: tier.isVariablePrice,
          min_price: tier.minPrice || 0,
          max_price: tier.maxPrice || 0,
          max_supply: tier.maxPatrons || 0,
          is_active: !tier.isActive, // Toggle the status
          image_url: tier.imageUrl,
          nft_metadata: tier.nftMetadata || "",
          onchain_index: tier.onchainIndex, // Include on-chain index for clarity
        };

        // Get JWT token for API call
        let jwt = authJwt;
        if (!jwt) {
          jwt = await refreshToken();
        }

        if (!jwt) {
          throw new Error("Authentication error. Please try again.");
        }

        // Call the API to update the database
        const response = await fetch("/api/pools/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            poolId,
            tierUpdates: [tierUpdatePayload],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || `Failed to update tier status in database`
          );
        }

        // Success!
        showToast.success(
          `Tier "${tier.name}" ${
            tier.isActive ? "deactivated" : "activated"
          } successfully!`,
          {
            id: loadingToast,
          }
        );

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Refresh the page data to show the updates
        router.refresh();

        return true;
      } catch (error) {
        console.error(`Error ${action.toLowerCase()} tier:`, error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Unknown error ${action.toLowerCase()} tier`;
        setError(errorMessage);
        showToast.error(errorMessage, { id: loadingToast });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [
      poolId,
      contractAddress,
      activateTierOnChain,
      deactivateTierOnChain,
      router,
      onSuccess,
      authJwt,
      refreshToken,
    ]
  );

  return {
    isLoading: isContractLoading,
    isUpdating,
    error: error || contractError,
    updateTier,
    createTier,
    toggleTierStatus,
  };
}
