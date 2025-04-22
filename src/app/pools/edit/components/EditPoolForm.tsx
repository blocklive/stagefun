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
import { Tier as CreateTier } from "../../create/types";
import { RewardItem } from "../../create/types";
import { useEditPoolTiers } from "@/hooks/useEditPoolTiers";
import SlugEditor from "./SlugEditor";
import { usePoolImageUpload } from "@/hooks/usePoolImageUpload";
import { usePoolDetailsEdit } from "@/hooks/usePoolDetailsEdit";
import { usePoolSlugEdit } from "@/hooks/usePoolSlugEdit";
import { usePoolEdit } from "@/hooks/usePoolEdit";

interface EditPoolFormProps {
  poolIdentifier: string;
}

export default function EditPoolForm({ poolIdentifier }: EditPoolFormProps) {
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
  const router = useRouter();
  const [showGetTokensModal, setShowGetTokensModal] = useState(false);
  const [viewportHeight, setViewportHeight] = useState("100vh");

  // Pool data
  const {
    pool,
    isLoading: isPoolLoading,
    refresh: refreshPool,
  } = usePoolDetails(poolIdentifier);

  // Log pool data for debugging
  console.log("Pool data loaded:", {
    hasPool: !!pool,
    isLoading: isPoolLoading,
    description: pool?.description,
    location: pool?.location,
    social_links: pool?.social_links,
  });

  // Create wrapper functions for the mutate calls
  const handleRefreshPool = useCallback(async () => {
    await refreshPool();
  }, [refreshPool]);

  // Use the custom hook for tier data only when pool is available
  const {
    tiers,
    availableRewardItems,
    isLoading: isTiersLoading,
    error: tiersError,
    mutate: refreshTiers,
  } = useEditPoolTiers({
    poolId: pool?.id,
    supabase,
  });

  const handleRefreshTiers = useCallback(async () => {
    await refreshTiers();
  }, [refreshTiers]);

  // IMAGE UPLOAD SECTION - auto-save when image changes
  const {
    imagePreview,
    isUploading: isUploadingImage,
    handleImageSelect: handleImageUpload,
    handleRemoveImage,
  } = usePoolImageUpload({
    poolId: pool?.id || "",
    currentImageUrl: pool?.image_url || null,
    supabase,
    onSuccess: handleRefreshPool,
  });

  // POOL DETAILS SECTION - description, location, socials
  const {
    description,
    setDescription,
    location,
    setLocation,
    socialLinks,
    setSocialLinks,
    isSubmitting: isSubmittingDetails,
    handleSubmit: handleSubmitDetails,
  } = usePoolDetailsEdit({
    poolId: pool?.id || "",
    initialDescription: pool?.description || "",
    initialLocation: pool?.location || "",
    initialSocialLinks: pool?.social_links || {},
    onSuccess: handleRefreshPool,
  });

  // Log form data for debugging
  console.log("Form data initialized with:", {
    description,
    location,
    socialLinks,
    imagePreview,
  });

  // SLUG SECTION - update public URL
  const {
    slug,
    slugError,
    setSlug,
    isSubmitting: isSubmittingSlug,
    handleSubmit: handleSubmitSlug,
  } = usePoolSlugEdit({
    poolId: pool?.id || "",
    initialSlug: pool?.slug || null,
    onSuccess: (newSlug) => {
      handleRefreshPool();
      // Don't navigate automatically as it might disrupt the user's flow
    },
  });

  // TIERS SECTION - we'll keep using the existing hook for now
  const {
    isLoading: isTierUpdateLoading,
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

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Sync remote tier data to local state when it changes
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      console.log("Setting initial tiers from DB:", tiers);
    }
    if (availableRewardItems && availableRewardItems.length > 0) {
      console.log(
        "Setting initial reward items from DB:",
        availableRewardItems
      );
    }
  }, [tiers, availableRewardItems]);

  // Handle tier changes from TiersSection
  const handleTiersChange = useCallback((updatedTiers: CreateTier[]) => {
    console.log("TiersSection updated tiers:", updatedTiers);
  }, []);

  // Add reward item handler (required by TiersSection)
  const handleAddRewardItem = (reward: Omit<RewardItem, "id">): RewardItem => {
    // Generate a temporary ID with a 'temp_' prefix to identify it as a new reward that needs to be created on the backend
    const tempId = `temp_${crypto.randomUUID()}`;

    // Create the reward object with the temporary ID
    const newReward = {
      ...reward,
      id: tempId,
    };

    // Add to available rewards list for immediate UI update
    // setLocalRewardItems((prev) => [...prev, newReward]);

    // Return the new reward with temporary ID - actual creation will happen in the backend
    return newReward;
  };

  // Convert file input event to direct file handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!dbUser || !supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }
      handleImageUpload(file);
    }
  };

  console.log("Local tiers:", tiers);

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
                    isUploadingImage={isUploadingImage}
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
                disabled={isSubmittingDetails}
              >
                {isSubmittingDetails ? "Saving..." : "Save Details"}
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
                  disabled={isSubmittingSlug || !!slugError}
                >
                  {isSubmittingSlug ? "Updating..." : "Update"}
                </button>
              </div>
            </div>

            <hr className="my-8 border-gray-700" />

            {/* TIERS SECTION */}
            <div className="mt-8 pb-16">
              <h2 className="text-2xl font-bold mb-6">Tiers</h2>

              {isTiersLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#836EF9]"></div>
                </div>
              ) : !isTiersLoading && tiers.length > 0 ? (
                <TiersSection
                  tiers={tiers}
                  onTiersChange={handleTiersChange}
                  availableRewardItems={availableRewardItems}
                  onAddRewardItem={handleAddRewardItem}
                  supabase={supabase!}
                  poolName={pool.name}
                  poolImage={imagePreview || ""}
                />
              ) : (
                <div>No tiers found</div>
              )}

              {tierUpdateError && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-4 rounded-lg mt-6">
                  {tierUpdateError}
                </div>
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
