import React, { useState, useRef, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTierImage } from "@/lib/utils/imageUpload";
import { AddRewardModal } from "./AddRewardModal";
import { Tier, RewardItem } from "../types";
import showToast from "@/utils/toast";
import { TierCard } from "./tier-components/TierCard";

export interface TiersSectionProps {
  tiers: Tier[];
  onTiersChange: (tiers: Tier[]) => void;
  availableRewardItems: RewardItem[];
  onAddRewardItem: (item: Omit<RewardItem, "id">) => RewardItem;
  supabase: SupabaseClient;
  poolName?: string;
  fundingGoal?: string;
  capAmount?: string;
  poolImage?: string;
}

export const TiersSection: React.FC<TiersSectionProps> = ({
  tiers,
  onTiersChange,
  availableRewardItems,
  onAddRewardItem,
  supabase,
  poolName,
  fundingGoal,
  capAmount,
  poolImage,
}) => {
  const [isUploadingImage, setIsUploadingImage] = useState<{
    [key: string]: boolean;
  }>({});
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [showRewardDropdown, setShowRewardDropdown] = useState<string | null>(
    null
  );
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const registerDropdownRef = (id: string, ref: HTMLDivElement | null) => {
    dropdownRefs.current[id] = ref;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const openDropdownId = showRewardDropdown;

      if (openDropdownId && dropdownRefs.current[openDropdownId]) {
        if (!dropdownRefs.current[openDropdownId]?.contains(target)) {
          setShowRewardDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRewardDropdown]);

  // Function to generate a default tier name based on tier number
  const generateTierName = React.useCallback(
    (tierNumber: number): string => {
      const tierNames = [
        "GM",
        "FOMO",
        "APE",
        "HODL",
        "MOON",
        "WEN",
        "SER",
        "BASED",
        "GIGACHAD",
      ];

      // Get list of already used names
      const usedNames = tiers.map((tier) => tier.name);

      // Find the first unused name from the list
      const availableName = tierNames.find((name) => !usedNames.includes(name));
      if (availableName) {
        return availableName;
      }

      // If all names are used, append a number to "GM"
      const gmCount = usedNames.filter((name) => name.startsWith("GM")).length;
      return `GM ${gmCount + 1}`;
    },
    [tiers]
  );

  const addTier = React.useCallback(async () => {
    const tierNumber = tiers.length + 1;
    const defaultName = generateTierName(tierNumber);

    // Default to 20 patrons
    const defaultMaxPatrons = "20";

    // Calculate price needed to reach funding goal with 20 patrons
    let defaultPrice = "0";
    if (fundingGoal) {
      const goalAmount = parseFloat(fundingGoal);
      if (!isNaN(goalAmount)) {
        // Calculate price as goal divided by default patron count
        const patronCount = parseInt(defaultMaxPatrons);
        defaultPrice = (goalAmount / patronCount).toFixed(2).toString();
      }
    }

    // Create metadata and upload to Supabase if we have a pool image
    let metadataUrl = "";
    let imageUrl = "";
    if (poolImage) {
      try {
        if (poolImage.startsWith("blob:")) {
          const response = await fetch(poolImage);
          if (!response.ok) {
            throw new Error("Failed to fetch pool image blob");
          }
          const blob = await response.blob();
          const file = new File([blob], "tier-image.jpg", { type: blob.type });

          // Upload the image and metadata
          const result = await uploadTierImage(
            file,
            defaultName,
            supabase,
            (isUploading) =>
              setIsUploadingImage((prev) => ({ ...prev, new: isUploading }))
          );

          if (!result.imageUrl || !result.metadataUrl) {
            throw new Error("Failed to get URLs after upload");
          }

          imageUrl = result.imageUrl;
          metadataUrl = result.metadataUrl;
        } else if (poolImage.startsWith("http")) {
          // If it's already a proper URL, use it directly
          imageUrl = poolImage;

          // Create metadata JSON directly using the existing URL
          const metadata = {
            name: defaultName,
            description: `${defaultName} Tier NFT`,
            image: poolImage,
            tier: defaultName,
            attributes: [{ trait_type: "Tier", value: defaultName }],
          };

          // Upload metadata to Supabase storage
          const metadataFileName = `${Math.random()
            .toString(36)
            .substring(2)}_${Date.now()}_metadata.json`;
          const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
            type: "application/json",
          });
          const metadataFile = new File([metadataBlob], metadataFileName, {
            type: "application/json",
          });

          // Try standard upload for metadata
          let metadataData;
          let metadataError;

          try {
            const result = await supabase.storage
              .from("pool-images")
              .upload(metadataFileName, metadataFile, {
                cacheControl: "3600",
                upsert: false,
                contentType: "application/json",
              });

            metadataData = result.data;
            metadataError = result.error;
          } catch (uploadError) {
            console.error(
              "Initial metadata upload attempt failed:",
              uploadError
            );
            metadataError = uploadError;
          }

          // If there's an error, try the fallback approach
          if (
            metadataError &&
            typeof metadataError === "object" &&
            "message" in metadataError &&
            typeof metadataError.message === "string" &&
            (metadataError.message.includes("security policy") ||
              metadataError.message.includes("permission denied") ||
              metadataError.message.includes("invalid algorithm"))
          ) {
            console.log(
              "RLS policy error on metadata, trying alternative approach..."
            );

            // Create a FormData object for metadata
            const metadataForm = new FormData();
            metadataForm.append("file", metadataFile);

            // Use fetch API to upload directly to Supabase Storage REST API
            try {
              // Get authentication token from user session
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;

              if (!token) {
                throw new Error("No authentication token available");
              }

              const uploadResponse = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${metadataFileName}`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: metadataForm,
                }
              );

              if (!uploadResponse.ok) {
                throw new Error(
                  `Upload failed with status: ${uploadResponse.status}`
                );
              }

              console.log("Metadata upload successful via REST API");
              metadataError = null;
            } catch (restError) {
              console.error("REST API metadata upload failed:", restError);
              metadataError = restError;
            }
          }

          if (metadataError) {
            const errorMessage =
              typeof metadataError === "object" &&
              metadataError !== null &&
              "message" in metadataError
                ? String(metadataError.message)
                : "Unknown error";
            throw new Error(`Failed to upload metadata: ${errorMessage}`);
          }

          // Get the public URL for the metadata
          const {
            data: { publicUrl: uploadedMetadataUrl },
          } = supabase.storage
            .from("pool-images")
            .getPublicUrl(metadataFileName);

          metadataUrl = uploadedMetadataUrl;
        } else {
          // If it's not a blob or http URL, something went wrong
          console.warn(
            "Invalid image format received. Expected blob: or http: URL."
          );
          showToast.error("Invalid image format. Please try again.");
          return;
        }
      } catch (error) {
        console.error("Detailed error creating tier:", error);
        showToast.error("Failed to upload tier image and metadata");
        return; // Don't create the tier if image upload fails
      }
    }

    const newTier: Tier = {
      id: crypto.randomUUID(),
      name: defaultName,
      price: defaultPrice,
      isActive: true,
      nftMetadata: metadataUrl,
      isVariablePrice: false,
      minPrice: "0",
      maxPrice: "0",
      maxPatrons: defaultMaxPatrons,
      description: "",
      rewardItems: [],
      imageUrl: imageUrl,
      modifiedFields: new Set(),
      pricingMode: "fixed",
      patronsMode: "limited",
    };
    console.log("New tier created:", newTier);
    onTiersChange([...tiers, newTier]);
  }, [
    tiers,
    generateTierName,
    fundingGoal,
    poolImage,
    onTiersChange,
    supabase,
  ]);

  // Create first tier automatically
  useEffect(() => {
    if (tiers.length === 0) {
      addTier();
    }
  }, [tiers.length, addTier]);

  // Update unmodified fields when dependencies change
  useEffect(() => {
    const updateTiers = async () => {
      const updatedTiers = await Promise.all(
        tiers.map(async (tier, index) => {
          const updates: Partial<Tier> = {};

          // Only update name if it's the first tier and hasn't been modified
          if (index === 0 && !tier.modifiedFields.has("name") && !tier.name) {
            updates.name = generateTierName(1);
          }

          // Update price and max patrons if not modified and funding goal changes
          if (!tier.modifiedFields.has("price") && fundingGoal) {
            const goalAmount = parseFloat(fundingGoal);
            if (!isNaN(goalAmount)) {
              // Set default max patrons to 20 if not modified
              if (!tier.modifiedFields.has("maxPatrons")) {
                updates.maxPatrons = "20";
              }

              // Calculate price based on goal and patron count (either the default 20 or current value)
              const patronCount = parseInt(
                updates.maxPatrons || tier.maxPatrons || "20"
              );
              updates.price = (goalAmount / patronCount).toFixed(2).toString();
            }
          }

          // Update image and metadata if not modified and pool image changes
          if (
            !tier.modifiedFields.has("imageUrl") &&
            poolImage &&
            (!tier.imageUrl || tier.imageUrl === "")
          ) {
            console.log("Updating tier image:", { tierId: tier.id, poolImage });
            try {
              // Create metadata JSON using the poolImage URL
              const metadata = {
                name: tier.name,
                description: `${tier.name} Tier NFT`,
                image: poolImage,
                tier: tier.name,
                attributes: [{ trait_type: "Tier", value: tier.name }],
              };

              // Upload metadata to Supabase storage
              const metadataFileName = `${Math.random()
                .toString(36)
                .substring(2)}_${Date.now()}_metadata.json`;
              const metadataBlob = new Blob(
                [JSON.stringify(metadata, null, 2)],
                {
                  type: "application/json",
                }
              );
              const metadataFile = new File([metadataBlob], metadataFileName, {
                type: "application/json",
              });

              // Try standard upload for metadata
              let metadataData;
              let metadataError;

              try {
                const result = await supabase.storage
                  .from("pool-images")
                  .upload(metadataFileName, metadataFile, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: "application/json",
                  });

                metadataData = result.data;
                metadataError = result.error;
              } catch (uploadError) {
                console.error(
                  "Initial metadata upload attempt failed:",
                  uploadError
                );
                metadataError = uploadError;
              }

              // If there's an error, try an alternative approach
              if (
                metadataError &&
                typeof metadataError === "object" &&
                "message" in metadataError &&
                typeof metadataError.message === "string" &&
                (metadataError.message.includes("security policy") ||
                  metadataError.message.includes("permission denied") ||
                  metadataError.message.includes("invalid algorithm"))
              ) {
                console.log(
                  "Error with standard upload, trying alternative approach..."
                );

                // Create a FormData object for metadata
                const metadataForm = new FormData();
                metadataForm.append("file", metadataFile);

                // Use fetch API to upload directly to Supabase Storage REST API
                try {
                  // Get authentication token from user session
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  const token = session?.access_token;

                  if (!token) {
                    throw new Error("No authentication token available");
                  }

                  const uploadResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${metadataFileName}`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                      body: metadataForm,
                    }
                  );

                  if (!uploadResponse.ok) {
                    throw new Error(
                      `Upload failed with status: ${uploadResponse.status}`
                    );
                  }

                  console.log("Upload successful via alternative method");
                  metadataError = null;
                } catch (restError) {
                  console.error("Alternative upload failed:", restError);
                  metadataError = restError;
                }
              }

              if (metadataError) {
                const errorMessage =
                  typeof metadataError === "object" &&
                  metadataError !== null &&
                  "message" in metadataError
                    ? String(metadataError.message)
                    : "Unknown error";
                throw new Error(`Failed to upload metadata: ${errorMessage}`);
              }

              // Get the public URL for the metadata
              const {
                data: { publicUrl: metadataUrl },
              } = supabase.storage
                .from("pool-images")
                .getPublicUrl(metadataFileName);

              updates.imageUrl = poolImage;
              updates.nftMetadata = metadataUrl;
              console.log("Set tier image and metadata:", {
                tierId: tier.id,
                imageUrl: updates.imageUrl,
                metadataUrl: updates.nftMetadata,
              });
            } catch (error) {
              console.error("Detailed error in updateTierMetadata:", error);
              showToast.error("Failed to upload tier metadata");
            }
          }

          // Only update if we have changes and they're different from current values
          if (Object.keys(updates).length > 0) {
            const updatedTier = { ...tier, ...updates };
            console.log("Tier updates:", {
              tierId: tier.id,
              updates,
              before: tier,
              after: updatedTier,
            });
            if (JSON.stringify(updatedTier) !== JSON.stringify(tier)) {
              return updatedTier;
            }
          }
          return tier;
        })
      );

      // Only update if there are actual changes
      const hasChanges = updatedTiers.some(
        (updatedTier, index) =>
          JSON.stringify(updatedTier) !== JSON.stringify(tiers[index])
      );

      if (hasChanges) {
        console.log("Updating tiers:", updatedTiers);
        onTiersChange(updatedTiers);
      }
    };

    updateTiers();
  }, [
    poolName,
    fundingGoal,
    poolImage,
    tiers,
    generateTierName,
    onTiersChange,
    supabase,
  ]);

  const removeTier = (id: string) => {
    onTiersChange(tiers.filter((tier) => tier.id !== id));
  };

  const updateTier = (
    id: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: string | string[] | boolean
  ) => {
    console.log("Updating tier:", { id, fieldOrFields, value });

    onTiersChange(
      tiers.map((tier) => {
        if (tier.id === id) {
          // Determine if this is a batch update or single field update
          if (typeof fieldOrFields === "object") {
            // Batch update with an object of fields
            const updates = fieldOrFields;
            const modifiedFields = new Set(tier.modifiedFields);

            // Add all fields in the update to modifiedFields
            Object.keys(updates).forEach((field) => {
              modifiedFields.add(field as keyof Tier);
            });

            // Return updated tier with all fields from the updates object
            return {
              ...tier,
              ...updates,
              modifiedFields,
            };
          } else {
            // Single field update
            const field = fieldOrFields;
            const modifiedFields = new Set(tier.modifiedFields);
            modifiedFields.add(field);

            return {
              ...tier,
              [field]: value,
              modifiedFields,
            };
          }
        }
        return tier;
      })
    );
  };

  const handleAddRewardImage = (
    imageUrl: string,
    metadataUrl: string,
    tierId: string
  ) => {
    // Add both fields as modified when user uploads an image
    console.log("Adding reward image:", imageUrl, metadataUrl, tierId);
    onTiersChange(
      tiers.map((tier) => {
        if (tier.id === tierId) {
          const modifiedFields = new Set(tier.modifiedFields);
          modifiedFields.add("imageUrl");
          modifiedFields.add("nftMetadata");

          // IMPORTANT: These values will be saved to the database in the API
          // as image_url and nft_metadata fields in the tiers table
          return {
            ...tier,
            imageUrl,
            nftMetadata: metadataUrl,
            modifiedFields,
          };
        }
        return tier;
      })
    );
  };

  const handleAddReward = async (reward: Omit<RewardItem, "id">) => {
    try {
      // Use the parent component's function to add reward - it returns the complete reward with ID
      const newReward = onAddRewardItem(reward);

      // Now use the ID assigned by the parent component
      const rewardId = newReward.id;

      // If we have a current tier selected
      if (currentTierId) {
        // Find the tier to update
        const tierToUpdate = tiers.find((t) => t.id === currentTierId);

        if (!tierToUpdate) {
          setShowAddRewardModal(false);
          setCurrentTierId(null);
          return;
        }

        // Create updated tier with the new reward ID
        const updatedTier = {
          ...tierToUpdate,
          rewardItems: [...tierToUpdate.rewardItems, rewardId],
          modifiedFields: new Set([
            ...tierToUpdate.modifiedFields,
            "rewardItems",
          ]),
        };

        // Create a new tiers array with the updated tier
        const updatedTiers = tiers.map((t) =>
          t.id === currentTierId ? updatedTier : t
        );

        // Update tiers state
        onTiersChange(updatedTiers);
      }

      // Close modal and reset
      setShowAddRewardModal(false);
      setCurrentTierId(null);
    } catch (error) {
      console.error("Error adding reward:", error);
      setShowAddRewardModal(false);
      setCurrentTierId(null);
    }
  };

  const handleSetIsUploadingImage = (id: string, isUploading: boolean) => {
    setIsUploadingImage((prev) => ({ ...prev, [id]: isUploading }));
  };

  const handleCreateNewReward = (tierId: string) => {
    setCurrentTierId(tierId);
    setShowAddRewardModal(true);
  };

  return (
    <div className="mb-12 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tiers</h2>
        <button
          type="button"
          onClick={addTier}
          className="flex items-center gap-2 px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Tier
        </button>
      </div>

      <div className="space-y-6 w-full">
        {tiers.map((tier, index) => (
          <TierCard
            key={tier.id}
            tier={tier}
            index={index}
            onRemoveTier={removeTier}
            onUpdateTier={updateTier}
            onSetCurrentTierId={setCurrentTierId}
            onAddRewardImage={handleAddRewardImage}
            supabase={supabase}
            isUploadingImage={isUploadingImage[tier.id] || false}
            setIsUploadingImage={handleSetIsUploadingImage}
            availableRewardItems={availableRewardItems}
            onCreateNewReward={handleCreateNewReward}
            capAmount={capAmount}
            fundingGoal={fundingGoal}
            onAddReward={() => {}}
            onRemoveReward={() => {}}
            onUpdateReward={() => {}}
          />
        ))}
      </div>

      {/* Add Reward Modal */}
      {showAddRewardModal && (
        <AddRewardModal
          onClose={() => {
            setShowAddRewardModal(false);
            setCurrentTierId(null);
          }}
          onAdd={handleAddReward}
        />
      )}
    </div>
  );
};
