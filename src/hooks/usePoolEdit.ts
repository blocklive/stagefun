import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Tier as CreateTier } from "@/app/pools/create/types";
import { SocialLinksType } from "@/app/components/SocialLinksInput";
import { uploadPoolImage } from "@/lib/utils/imageUpload";
import { useTierManagement } from "@/hooks/useTierManagement";
import { toUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";
import { MAX_SAFE_VALUE, isUncapped } from "@/lib/utils/contractValues";
import { validateSlug } from "@/lib/utils/slugValidation";
import showToast from "@/utils/toast";
import { SupabaseClient } from "@supabase/supabase-js";
import { KeyedMutator } from "swr";

interface PoolEditOptions {
  poolId: string;
  contractAddress: string | null;
  creatorId: string;
  currentSlug: string | null;
  refreshPool: () => Promise<void>;
  refreshTiers: () => Promise<void>;
  supabase: SupabaseClient | null;
}

interface PoolEditData {
  poolName: string;
  minCommitment: string;
  description: string;
  location: string;
  socialLinks: SocialLinksType;
  slug: string;
  selectedImage: File | null;
  imagePreview: string | null;
  currentImageUrl: string | null;
  tiers: CreateTier[];
  rewardItems?: any[]; // For handling temporary reward items
}

interface UsePoolEditResult {
  isSubmitting: boolean;
  isUploadingImage: boolean;
  slugError: string | null;
  setSlugError: (error: string | null) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    data: PoolEditData
  ) => Promise<void>;
}

export function usePoolEdit({
  poolId,
  contractAddress,
  creatorId,
  currentSlug,
  refreshPool,
  refreshTiers,
  supabase,
}: PoolEditOptions): UsePoolEditResult {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const { updateTier, createTier } = useTierManagement({
    poolId: poolId,
    contractAddress: contractAddress || "",
    onSuccess: () => {
      refreshPool();
      refreshTiers();
    },
  });

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    data: PoolEditData
  ) => {
    e.preventDefault();

    // Validate that we have user and pool info
    if (!poolId) {
      showToast.error("Pool data not available");
      return;
    }

    if (!supabase) {
      showToast.error("Authentication error. Please try again.");
      return;
    }

    // Validate slug if present
    if (data.slug) {
      const validation = validateSlug(data.slug);
      if (!validation.isValid) {
        setSlugError(validation.reason || "Invalid slug");
        showToast.error(validation.reason || "Invalid slug format");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Handle image upload or removal
      let imageUrl = data.currentImageUrl;
      if (data.selectedImage) {
        setIsUploadingImage(true);
        const uploadResult = await uploadPoolImage(
          data.selectedImage,
          supabase,
          setIsUploadingImage
        );
        if (!uploadResult?.imageUrl) {
          setIsSubmitting(false);
          return;
        }
        imageUrl = uploadResult.imageUrl;
      }
      if (!data.imagePreview && !data.selectedImage) {
        imageUrl = null;
      }

      // Basic pool updates
      const updates = {
        name: data.poolName,
        min_commitment: data.minCommitment
          ? parseFloat(data.minCommitment)
          : null,
        image_url: imageUrl,
        description: data.description,
        location: data.location,
        social_links:
          Object.keys(data.socialLinks).length > 0
            ? JSON.parse(JSON.stringify(data.socialLinks))
            : null,
        slug: data.slug || null,
      };

      // Process tier updates
      if (data.tiers.length > 0) {
        try {
          // Process tiers one by one
          for (const tier of data.tiers) {
            if (tier.id) {
              // Existing tier - update it
              const updateSuccess = await updateTier({
                ...tier,
                dbId: tier.id, // Pass the database ID for API updates
                onchainIndex: tier.onchain_index
                  ? Number(tier.onchain_index)
                  : 0, // Convert to number
                isVariablePrice: tier.isVariablePrice,
                maxPatrons: tier.maxPatrons ? Number(tier.maxPatrons) : 0, // Convert to number
                minPrice: tier.minPrice ? Number(tier.minPrice) : 0, // Convert to number
                maxPrice: tier.maxPrice ? Number(tier.maxPrice) : 0, // Convert to number
                price: tier.price ? Number(tier.price) : 0, // Convert price to number
                imageUrl: tier.imageUrl || "",
                isActive: tier.isActive,
                nftMetadata: tier.nftMetadata || "",
              });

              if (!updateSuccess) {
                throw new Error(`Failed to update tier: ${tier.name}`);
              }
            } else {
              // This is a new tier - create it
              const createSuccess = await createTier({
                ...tier,
                onchainIndex: 0, // New tiers will get assigned an index on-chain
                isVariablePrice: tier.isVariablePrice,
                maxPatrons: tier.maxPatrons ? Number(tier.maxPatrons) : 0, // Convert to number
                minPrice: tier.minPrice ? Number(tier.minPrice) : 0, // Convert to number
                maxPrice: tier.maxPrice ? Number(tier.maxPrice) : 0, // Convert to number
                price: tier.price ? Number(tier.price) : 0, // Convert price to number
                imageUrl: tier.imageUrl || "",
                isActive: tier.isActive !== undefined ? tier.isActive : true, // Default to active if not specified
                nftMetadata: tier.nftMetadata || "",
              });

              if (!createSuccess) {
                throw new Error(`Failed to create tier: ${tier.name}`);
              }
            }
          }
        } catch (error) {
          console.error("Error updating tiers:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to update tiers";
          showToast.remove();
          showToast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }
      }

      // Now continue with database updates via API
      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Prepare tier updates for database - only include modified tiers
      const tierUpdates = data.tiers.map((tier) => {
        const tierData: any = {
          // Only include ID for existing tiers
          ...(tier.id && { id: tier.id }),
          name: tier.name,
          description: tier.description,
          price: Number(toUSDCBaseUnits(parseFloat(tier.price))),
          is_variable_price: tier.isVariablePrice,
          min_price: tier.isVariablePrice
            ? Number(toUSDCBaseUnits(parseFloat(tier.minPrice)))
            : null,
          max_price: tier.isVariablePrice
            ? isUncapped(tier.maxPrice)
              ? Number(MAX_SAFE_VALUE)
              : Number(toUSDCBaseUnits(parseFloat(tier.maxPrice)))
            : null,
          max_supply:
            tier.patronsMode === "limited" ? parseInt(tier.maxPatrons) : null,
          is_active: tier.isActive,
          image_url: tier.imageUrl,
          nft_metadata: tier.nftMetadata || "",
          onchain_index: tier.onchain_index || null, // Only include for existing tiers
        };

        // Add reward items if they've been modified
        if (tier.modifiedFields?.has("rewardItems")) {
          // Separate temporary IDs and real IDs
          const tempRewardIds: string[] = [];
          const realRewardIds: string[] = [];

          for (const id of tier.rewardItems || []) {
            if (id.startsWith("temp_")) {
              tempRewardIds.push(id);
            } else {
              realRewardIds.push(id);
            }
          }

          // Include real reward IDs
          Object.assign(tierData, { rewardItems: realRewardIds });

          // Include temporary rewards with their data for creation in the backend
          if (tempRewardIds.length > 0 && data.rewardItems) {
            // Get the full reward objects for temporary IDs
            const newRewards = tempRewardIds
              .map((id) => data.rewardItems?.find((item) => item.id === id))
              .filter(Boolean)
              .map((reward) => ({
                name: reward.name,
                description: reward.description || "",
                type: reward.type || "default",
              }));

            if (newRewards.length > 0) {
              Object.assign(tierData, { newRewards });
            }
          }
        }

        return tierData;
      });

      // Include tier updates in the request if there are any
      const requestBody = {
        poolId: poolId,
        updates,
        ...(tierUpdates.length > 0 && { tierUpdates }),
      };

      console.log("Sending update request:", requestBody);

      const response = await fetch("/api/pools/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (!response.ok) {
        showToast.remove();
        showToast.error(result.error || "Failed to update pool");
        setIsSubmitting(false);
        return;
      }

      showToast.remove();
      showToast.success("Pool updated successfully!");

      // Refresh data after successful update
      await refreshPool();
      await refreshTiers();

      const newSlug = updates.slug || currentSlug;
      if (newSlug) {
        router.push(`/${newSlug}`);
      } else {
        router.push(`/pools/${poolId}`);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      showToast.remove();
      showToast.error("Failed to update pool");
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isUploadingImage,
    slugError,
    setSlugError,
    handleSubmit,
  };
}
