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
import { Tier, RewardItem } from "../../create/types";
import { useEditPoolTiers } from "@/hooks/useEditPoolTiers";
import SlugEditor from "./SlugEditor";
import { usePoolEdit, PoolUpdateFields } from "@/hooks/usePoolEdit";
import TierDisplayItem from "./TierDisplayItem";
import EditTierModal from "./EditTierModal";
import CreateTierModal from "./CreateTierModal";

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
  const [isEditTierModalOpen, setIsEditTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isCreateTierModalOpen, setIsCreateTierModalOpen] = useState(false);

  // Pool data
  const {
    pool,
    isLoading: isPoolLoading,
    refresh: refreshPool,
  } = usePoolDetails(poolIdentifier);

  // Use the custom hook for tier data
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

  // Use our simplified hook for all pool updates
  const { updatePool, isUpdating, error, validateSlugField } = usePoolEdit({
    poolId: pool?.id || "",
    onSuccess: () => {
      handleRefreshPool();
      handleRefreshTiers();
    },
  });

  // TIERS SECTION - we'll keep using the existing hook for now
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
      setImagePreview(pool.image_url || null);
      setSlug(pool.slug || "");

      console.log("Synced pool data to local state:", {
        description: pool.description,
        location: pool.location,
        social_links: pool.social_links,
        slug: pool.slug,
      });
    }
  }, [pool]);

  // Validate slug on change
  useEffect(() => {
    if (slug) {
      const result = validateSlugField(slug);
      setSlugError(result.isValid ? null : result.reason || "Invalid slug");
    } else {
      setSlugError(null);
    }
  }, [slug, validateSlugField]);

  // Sync remote tier data to local state when it changes
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      console.log("Tiers from DB:", tiers);
    }
    if (availableRewardItems && availableRewardItems.length > 0) {
      console.log("Reward items from DB:", availableRewardItems);
    }
  }, [tiers, availableRewardItems]);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle opening the edit tier modal
  const handleEditTier = (tier: Tier) => {
    setSelectedTier(tier);
    setIsEditTierModalOpen(true);
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

    // Return the new reward with temporary ID - actual creation will happen in the backend
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
    showToast.loading("Uploading image...");

    try {
      // Get a signed URL for upload
      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error");
        return;
      }

      const getSignedUrlResponse = await fetch("/api/upload/get-signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          poolId: pool?.id,
        }),
      });

      if (!getSignedUrlResponse.ok) {
        showToast.error("Failed to get upload URL");
        return;
      }

      const { signedUrl, imageUrl: newImageUrl } =
        await getSignedUrlResponse.json();

      // Upload to the signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        showToast.error("Failed to upload image");
        return;
      }

      // Update the pool with the new image URL
      await updatePool({ image_url: newImageUrl }, "Updating image...");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast.error("Failed to upload image");
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    await updatePool({ image_url: null }, "Removing image...");
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle details submit
  const handleSubmitDetails = async () => {
    const updates: PoolUpdateFields = {
      description,
      location,
      instagram: socialLinks.instagram,
      twitter: socialLinks.twitter,
      discord: socialLinks.discord,
      website: socialLinks.website,
    };

    console.log("Submitting details update:", updates);
    await updatePool(updates, "Updating pool details...");
  };

  // Handle slug submit
  const handleSubmitSlug = async () => {
    if (slugError) {
      showToast.error(slugError);
      return;
    }

    await updatePool({ slug }, "Updating public URL...");
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
                    isUploadingImage={isUpdating}
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
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save Details"}
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
                  disabled={isUpdating || !!slugError}
                >
                  {isUpdating ? "Updating..." : "Update"}
                </button>
              </div>
            </div>

            <hr className="my-8 border-gray-700" />

            {/* TIERS SECTION */}
            <div className="mt-8 pb-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Tiers</h2>
                {!isTiersLoading && tiers && tiers.length > 0 && (
                  <button
                    className="py-2 px-6 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-sm text-white font-medium transition-colors flex items-center gap-2"
                    onClick={() => setIsCreateTierModalOpen(true)}
                  >
                    <span>+</span> Add Tier
                  </button>
                )}
              </div>

              {isTiersLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#836EF9]"></div>
                </div>
              ) : !isTiersLoading && tiers && tiers.length > 0 ? (
                <div className="space-y-4">
                  {tiers.map((tier) => (
                    <TierDisplayItem
                      key={tier.id}
                      tier={tier}
                      onEditTier={handleEditTier}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#FFFFFF0A] p-4 rounded-lg text-center">
                  <p className="text-white/70">No tiers found</p>
                  <button
                    className="mt-4 py-2 px-6 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-sm text-white font-medium transition-colors"
                    onClick={() => setIsCreateTierModalOpen(true)}
                  >
                    Create Tier
                  </button>
                </div>
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

      {/* Edit Tier Modal */}
      {pool && (
        <EditTierModal
          isOpen={isEditTierModalOpen}
          onClose={() => setIsEditTierModalOpen(false)}
          tier={selectedTier}
          poolId={pool.id}
          contractAddress={pool.contract_address || ""}
          poolName={pool.name}
          poolImage={imagePreview || pool.image_url || ""}
          availableRewardItems={availableRewardItems}
          onSuccess={() => {
            handleRefreshPool();
            handleRefreshTiers();
          }}
        />
      )}

      {/* Create Tier Modal */}
      {pool && (
        <CreateTierModal
          isOpen={isCreateTierModalOpen}
          onClose={() => setIsCreateTierModalOpen(false)}
          poolId={pool.id}
          contractAddress={pool.contract_address || ""}
          poolName={pool.name}
          poolImage={imagePreview || pool.image_url || ""}
          availableRewardItems={availableRewardItems}
          onSuccess={() => {
            handleRefreshPool();
            handleRefreshTiers();
          }}
        />
      )}

      <GetTokensModal
        isOpen={showGetTokensModal}
        onClose={() => setShowGetTokensModal(false)}
      />
    </>
  );
}
