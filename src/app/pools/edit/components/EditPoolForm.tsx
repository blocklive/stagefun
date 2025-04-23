import React, { useEffect, useState, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import { useSupabase } from "../../../../contexts/SupabaseContext";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import GetTokensModal from "../../../components/GetTokensModal";
import showToast from "@/utils/toast";
import PoolImageUpload from "@/app/components/PoolImageUpload";
import { usePoolDetails } from "@/hooks/usePoolDetails";
import SocialLinksInput, {
  SocialLinksType,
} from "@/app/components/SocialLinksInput";
import RichTextEditor from "@/app/components/RichTextEditor";
import { TiersSection } from "../../create/components/TiersSection";
import { useTierManagement } from "@/hooks/useTierManagement";
import { TierUpdateData } from "@/hooks/usePoolTierUpdate";
import { Tier, RewardItem } from "../../create/types";
import { useEditPoolTiers } from "@/hooks/useEditPoolTiers";
import SlugEditor from "./SlugEditor";
import { usePoolEdit, PoolUpdateFields } from "@/hooks/usePoolEdit";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

interface EditPoolFormProps {
  poolIdentifier: string;
}

export default function EditPoolForm({ poolIdentifier }: EditPoolFormProps) {
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [showGetTokensModal, setShowGetTokensModal] = useState(false);
  const [viewportHeight, setViewportHeight] = useState("100vh");

  // Local state for form fields
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [socialLinks, setSocialLinks] = useState<SocialLinksType>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [localTiers, setLocalTiers] = useState<Tier[]>([]);

  // Add separate loading states for each section
  const [isDetailsUpdating, setIsDetailsUpdating] = useState(false);
  const [isSlugUpdating, setIsSlugUpdating] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  // Pool data
  const {
    pool,
    isLoading: isPoolLoading,
    refresh: refreshPool,
  } = usePoolDetails(poolIdentifier);

  // Use the custom hook for tier data
  const {
    tiers: remoteTiers,
    availableRewardItems,
    isLoading: isTiersLoading,
    error: tiersError,
    mutate: refreshTiers,
  } = useEditPoolTiers({
    poolId: pool?.id,
    supabase,
  });

  // Use our simplified hook for all pool updates
  const { updatePool, isUpdating, error, validateSlugField } = usePoolEdit({
    poolId: pool?.id || "",
    onSuccess: () => {
      handleRefreshPool();
      handleRefreshTiers();
      // Reset all loading states
      setIsDetailsUpdating(false);
      setIsSlugUpdating(false);
      setIsImageUploading(false);
    },
  });

  // TIERS SECTION - we'll keep using the existing hook for tier operations
  const {
    isLoading: isTierLoading,
    isUpdating: isTierUpdating,
    error: tierUpdateError,
    updateTier,
    createTier,
    toggleTierStatus,
  } = useTierManagement({
    poolId: pool?.id || "",
    contractAddress: pool?.contract_address || "",
    onSuccess: () => {
      handleRefreshPool();
      handleRefreshTiers();
    },
  });

  // Create wrapper functions for the mutate calls
  const handleRefreshPool = useCallback(async () => {
    await refreshPool();
  }, [refreshPool]);

  const handleRefreshTiers = useCallback(async () => {
    await refreshTiers();
  }, [refreshTiers]);

  // Log pool data for debugging
  useEffect(() => {
    console.log("Pool data loaded:", {
      hasPool: !!pool,
      isLoading: isPoolLoading,
      description: pool?.description,
      location: pool?.location,
      social_links: pool?.social_links,
    });
  }, [pool, isPoolLoading]);

  // Sync pool data to local state when it changes
  useEffect(() => {
    if (pool) {
      setDescription(pool.description || "");
      setLocation(pool.location || "");
      setSocialLinks(pool.social_links || {});
      console.log("Setting imagePreview from pool.image_url:", pool.image_url);
      setImagePreview(pool.image_url || null);
      setSlug(pool.slug || "");

      console.log("Synced pool data to local state:", {
        description: pool.description,
        location: pool.location,
        social_links: pool.social_links,
        slug: pool.slug,
        image_url: pool.image_url,
      });
    }
  }, [pool]);

  // Sync remote tier data to local state - revise the useEffect
  useEffect(() => {
    if (remoteTiers && remoteTiers.length > 0) {
      console.log("Setting local tiers from remote data:", remoteTiers);
      setLocalTiers(remoteTiers);
    } else {
      console.log("No remote tiers found:", remoteTiers);
    }
  }, [remoteTiers]);

  // Validate slug on change
  useEffect(() => {
    if (slug) {
      const result = validateSlugField(slug);
      setSlugError(result.isValid ? null : result.reason || "Invalid slug");
    } else {
      setSlugError(null);
    }
  }, [slug, validateSlugField]);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle local tier changes
  const handleTiersChange = (updatedTiers: Tier[]) => {
    console.log("Updating local tiers:", updatedTiers);
    setLocalTiers(updatedTiers);
  };

  // Add reward item handler (required by TiersSection)
  const handleAddRewardItem = (reward: Omit<RewardItem, "id">): RewardItem => {
    // Generate a temporary ID with a 'temp_' prefix to identify it as a new reward that needs to be created on the backend
    const tempId = `temp_${crypto.randomUUID()}`;

    // Create the reward object with the temporary ID
    const newReward = {
      ...reward,
      id: tempId,
    };

    // In a real implementation, we would also save this to the database
    // For now, we just return the new reward with its temporary ID
    // The createTier or updateTier functions will handle saving the rewards
    console.log("Created new reward item:", newReward);
    return newReward;
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!dbUser || !supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Set the file for upload
      setImageFile(file);

      // Upload the file immediately
      handleImageUpload(file);
    }
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setIsImageUploading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      // Use the existing uploadPoolImage utility function
      const { imageUrl: newImageUrl } = await uploadPoolImage(
        file,
        supabase,
        setIsImageUploading,
        pool?.name
      );

      if (!newImageUrl) {
        throw new Error("Failed to upload image");
      }

      // Update the pool with the new image URL
      await updatePool({ image_url: newImageUrl }, "Updating image...");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast.error("Failed to upload image");
      setIsImageUploading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    setIsImageUploading(true);
    await updatePool({ image_url: null }, "Removing image...");
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle details submit
  const handleSubmitDetails = async () => {
    setIsDetailsUpdating(true);
    const updates: PoolUpdateFields = {
      description,
      location,
      instagram: socialLinks.instagram,
      twitter: socialLinks.twitter,
      discord: socialLinks.discord,
      website: socialLinks.website,
    };

    console.log("Submitting details update:", updates);
    try {
      await updatePool(updates, "Updating pool details...");
    } catch (error) {
      setIsDetailsUpdating(false);
    }
  };

  // Handle slug submit
  const handleSubmitSlug = async () => {
    if (slugError) {
      showToast.error(slugError);
      return;
    }

    setIsSlugUpdating(true);
    try {
      await updatePool({ slug }, "Updating public URL...");
    } catch (error) {
      setIsSlugUpdating(false);
    }
  };

  // Function to save tier changes to the database
  const handleSaveTierChanges = async () => {
    if (!pool?.id) {
      showToast.error("Pool ID is required to save tiers");
      return;
    }

    console.log("Saving tiers with data:", {
      tiersCount: localTiers.length,
      tiers: localTiers,
    });

    showToast.loading("Saving tier changes...");

    try {
      for (const tier of localTiers) {
        console.log("Processing tier:", {
          id: tier.id,
          name: tier.name,
          isNew: !tier.id || tier.id.startsWith("temp_"),
        });

        const basicTierData: TierUpdateData = {
          name: String(tier.name || ""),
          price: Number(tier.price || 0),
          description: String(tier.description || ""),
          isActive: Boolean(tier.isActive),
          nftMetadata: String(tier.nftMetadata || ""),
          isVariablePrice: Boolean(tier.isVariablePrice),
          minPrice: Number(tier.minPrice || 0),
          maxPrice: Number(tier.maxPrice || 0),
          maxPatrons: Number(tier.maxPatrons || 0),
          onchainIndex: Number(tier.onchain_index || 0),
        };

        if (tier.imageUrl && typeof tier.imageUrl === "string") {
          basicTierData.imageUrl = tier.imageUrl;
        }

        // For existing tiers - use the tier.id directly as dbId
        if (tier.id && !tier.id.startsWith("temp_")) {
          console.log("Updating existing tier with ID:", tier.id);
          await updateTier({
            ...basicTierData,
            dbId: tier.id, // Directly use tier.id for the database identifier
          });
        }
        // For new tiers
        else {
          console.log("Creating new tier:", basicTierData.name);
          await createTier(basicTierData);
        }
      }

      showToast.success("Tiers saved successfully");
      handleRefreshTiers();
    } catch (error) {
      console.error("Error saving tiers:", error);
      showToast.error("Failed to save tier changes");
    }
  };

  // Function to save a specific tier's changes
  const handleSaveSingleTier = async (tierId: string) => {
    if (!pool?.id) {
      showToast.error("Pool ID is required to save tier");
      return;
    }

    const tier = localTiers.find((t) => t.id === tierId);
    if (!tier) {
      showToast.error("Tier not found");
      return;
    }

    console.log("Saving single tier:", {
      id: tier.id,
      name: tier.name,
    });

    try {
      const basicTierData: TierUpdateData = {
        name: String(tier.name || ""),
        price: Number(tier.price || 0),
        description: String(tier.description || ""),
        isActive: Boolean(tier.isActive),
        nftMetadata: String(tier.nftMetadata || ""),
        isVariablePrice: Boolean(tier.isVariablePrice),
        minPrice: Number(tier.minPrice || 0),
        maxPrice: Number(tier.maxPrice || 0),
        maxPatrons: Number(tier.maxPatrons || 0),
        onchainIndex: Number(tier.onchain_index || 0),
      };

      if (tier.imageUrl && typeof tier.imageUrl === "string") {
        basicTierData.imageUrl = tier.imageUrl;
      }

      // For existing tiers - use the tier.id directly as dbId
      if (tier.id && !tier.id.startsWith("temp_")) {
        console.log("Updating existing tier with ID:", tier.id);
        await updateTier({
          ...basicTierData,
          dbId: tier.id, // Directly use tier.id for the database identifier
        });
      }
      // For new tiers
      else {
        console.log("Creating new tier:", basicTierData.name);
        await createTier(basicTierData);
      }

      showToast.remove();
      showToast.success(`Tier "${tier.name}" saved successfully`);
      handleRefreshTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
      showToast.error(`Failed to save tier "${tier.name}"`);
      throw error; // Re-throw to indicate failure to the caller
    }
  };

  return (
    <>
      <div className="px-4 md:px-8 max-w-6xl mx-auto">
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Edit Pool Details</h1>
        </div>

        {isPoolLoading || isClientLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : !pool ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
              <p className="text-gray-400">
                The pool identified by '{poolIdentifier}' could not be found.
              </p>
            </div>
          </div>
        ) : dbUser?.id !== pool.creator_id ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
              <p className="text-gray-400">
                You don't have permission to edit this pool.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* MAIN CONTENT GRID */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Image on top in mobile and medium view, right side in large screens */}
              <div className="order-1 lg:order-2 lg:col-span-5 flex justify-center lg:justify-start px-4">
                <div className="w-full" style={{ maxWidth: "220px" }}>
                  <PoolImageUpload
                    imagePreview={imagePreview}
                    isUploadingImage={isImageUploading}
                    onImageSelect={handleImageSelect}
                    onRemoveImage={handleRemoveImage}
                    placeholderText={pool.name || "Edit Pool"}
                  />
                </div>
              </div>

              {/* Left side: Description and Location - below image on mobile and medium */}
              <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Description</h2>
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Write your story..."
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Location</h2>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
                        <FaMapMarkerAlt className="text-white" />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Location (Optional)"
                      name="location"
                      value={location}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setLocation(e.target.value)
                      }
                      className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SOCIAL LINKS */}
            <div className="mt-8">
              <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />
            </div>

            {/* SAVE DETAILS BUTTON */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSubmitDetails}
                className="py-3 px-8 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium transition-colors"
                disabled={isDetailsUpdating}
              >
                {isDetailsUpdating ? "Saving..." : "Save Details"}
              </button>
            </div>

            <hr className="my-8 border-gray-700" />

            {/* PUBLIC URL SECTION - INLINE BUTTON */}
            <div className="flex flex-row items-center gap-4">
              <div className="flex-grow min-w-0 flex-shrink md:max-w-lg">
                <SlugEditor initialSlug={pool?.slug || ""} onChange={setSlug} />
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleSubmitSlug}
                  className="py-3 px-6 min-w-[100px] whitespace-nowrap bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium transition-colors"
                  disabled={isSlugUpdating || !!slugError}
                >
                  {isSlugUpdating ? "Updating..." : "Update"}
                </button>
              </div>
            </div>

            <hr className="my-8 border-gray-700" />

            {/* TIERS SECTION */}
            <div className="mt-8 pb-16">
              {isTiersLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#836EF9]"></div>
                </div>
              ) : (
                <>
                  {/* Add debugging info for tiers */}
                  {localTiers.length === 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg mb-6">
                      <p className="text-yellow-200">
                        No tiers found for this pool. You can add tiers using
                        the button above.
                      </p>
                      <p className="text-yellow-300 text-sm mt-2">
                        Debug: Remote tiers: {remoteTiers?.length || 0}, Local
                        tiers: {localTiers.length}
                      </p>
                    </div>
                  )}

                  <TiersSection
                    tiers={localTiers}
                    onTiersChange={handleTiersChange}
                    availableRewardItems={availableRewardItems || []}
                    onAddRewardItem={handleAddRewardItem}
                    supabase={supabase!}
                    poolName={pool?.name || ""}
                    fundingGoal={
                      pool?.target_amount ? pool.target_amount.toString() : "0"
                    }
                    capAmount=""
                    poolImage={pool?.image_url || ""}
                    isEditMode={true}
                    onSaveTier={handleSaveSingleTier}
                  />

                  {tierUpdateError && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-4 rounded-lg mt-6">
                      {tierUpdateError}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <GetTokensModal
        isOpen={showGetTokensModal}
        onClose={() => setShowGetTokensModal(false)}
      />
    </>
  );
}
