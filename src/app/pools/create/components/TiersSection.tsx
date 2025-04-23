import React, { useState, useRef, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTierImage } from "@/lib/utils/imageUpload";
import { AddRewardModal } from "./AddRewardModal";
import { Tier, RewardItem } from "../types";
import showToast from "@/utils/toast";
import { TierCard } from "./tier-components/TierCard";
import TabButton from "@/components/ui/TabButton";

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
  isEditMode?: boolean;
  onSaveTier?: (tierId: string) => Promise<void>;
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
  isEditMode = false,
  onSaveTier,
}) => {
  const [isUploadingImage, setIsUploadingImage] = useState<{
    [key: string]: boolean;
  }>({});
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [showRewardDropdown, setShowRewardDropdown] = useState<string | null>(
    null
  );
  const [editingTiers, setEditingTiers] = useState<Record<string, boolean>>({});
  const [modifiedTiers, setModifiedTiers] = useState<Record<string, boolean>>(
    {}
  );
  // Add state for active tab
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Store the list of tier IDs we've seen to avoid reinitializing already initialized tiers
  const knownTierIds = useRef<Set<string>>(new Set());

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

  // Set active tab to first tier when tiers change or on initial load
  useEffect(() => {
    if (
      tiers.length > 0 &&
      (!activeTabId || !tiers.find((t) => t.id === activeTabId))
    ) {
      setActiveTabId(tiers[0].id);
    }
  }, [tiers, activeTabId]);

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

    const newTiers = [...tiers, newTier];
    onTiersChange(newTiers);

    // Set the new tier as the active tab
    setActiveTabId(newTier.id);
  }, [
    tiers,
    generateTierName,
    fundingGoal,
    poolImage,
    onTiersChange,
    supabase,
  ]);

  // Create first tier automatically only if not in edit mode
  useEffect(() => {
    // Don't auto-create tiers when in edit mode
    if (tiers.length === 0 && !isEditMode) {
      console.log("Auto-creating first tier (not in edit mode)");
      addTier();
    } else if (tiers.length === 0 && isEditMode) {
      console.log("No tiers found but we're in edit mode - not auto-creating");
    }
  }, [tiers.length, addTier, isEditMode]);

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
    // Set a new active tab if we're removing the active one
    if (activeTabId === id && tiers.length > 1) {
      const currentIndex = tiers.findIndex((t) => t.id === id);
      const newIndex = Math.max(0, currentIndex - 1);
      setActiveTabId(tiers[newIndex].id);
    }

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

  // NEW: Function to toggle editing mode for a tier
  const toggleTierEditMode = (tierId: string) => {
    setEditingTiers((prev) => {
      const newState = { ...prev };
      newState[tierId] = !prev[tierId];

      // When disabling edit mode, clear the modified flag
      if (!newState[tierId]) {
        setModifiedTiers((prev) => {
          const newModified = { ...prev };
          delete newModified[tierId];
          return newModified;
        });
      }

      return newState;
    });
  };

  // Wrap the existing updateTier function to track modifications
  const updateTierWithTracking = (
    id: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: string | string[] | boolean
  ) => {
    // Mark this tier as modified if we're in edit mode
    if (isEditMode) {
      setModifiedTiers((prev) => ({
        ...prev,
        [id]: true,
      }));
    }

    // Call the original updateTier function
    updateTier(id, fieldOrFields, value);
  };

  // NEW: Function to handle saving a tier
  const handleSaveTier = async (tierId: string) => {
    if (onSaveTier) {
      try {
        // First toggle out of edit mode
        toggleTierEditMode(tierId);

        // Then save the tier
        await onSaveTier(tierId);

        // Clear the modified flag
        setModifiedTiers((prev) => {
          const newModified = { ...prev };
          delete newModified[tierId];
          return newModified;
        });
      } catch (error) {
        console.error(`Error saving tier ${tierId}:`, error);
        showToast.error("Failed to save tier changes");
      }
    } else {
      // If no save handler, just toggle edit mode
      toggleTierEditMode(tierId);
    }
  };

  // Initialize tiers to non-editable state when in edit mode
  // Only run on mount and when isEditMode changes
  useEffect(() => {
    if (isEditMode && tiers.length > 0) {
      // Create a new object to track tier edit states
      setEditingTiers((prevEditingTiers) => {
        const newEditingTiers = { ...prevEditingTiers };

        // Find any new tiers that we haven't seen before and set them to disabled
        tiers.forEach((tier) => {
          // Only set the edit state if we haven't already initialized this tier
          if (!knownTierIds.current.has(tier.id)) {
            newEditingTiers[tier.id] = false;
            knownTierIds.current.add(tier.id);
          }
        });

        return newEditingTiers;
      });
    }
  }, [isEditMode]); // Only re-run when isEditMode changes

  // Handle new tiers being added - only need to set edit state for new tiers
  useEffect(() => {
    if (isEditMode && tiers.length > 0) {
      // Check if there are any new tiers
      const newTiers = tiers.filter(
        (tier) => !knownTierIds.current.has(tier.id)
      );

      if (newTiers.length > 0) {
        console.log(
          "New tiers detected, initializing edit states:",
          newTiers.map((t) => t.id)
        );

        // Initialize these new tiers to disabled state
        setEditingTiers((prevEditingTiers) => {
          const newEditingTiers = { ...prevEditingTiers };

          newTiers.forEach((tier) => {
            newEditingTiers[tier.id] = false;
            knownTierIds.current.add(tier.id);
          });

          return newEditingTiers;
        });
      }
    }
  }, [tiers, isEditMode]);

  return (
    <div className="mb-12 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tiers</h2>
        {(!isEditMode ||
          Object.values(editingTiers).some((editing) => editing)) && (
          <button
            type="button"
            onClick={addTier}
            className="flex items-center gap-2 px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Tier
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      {tiers.length > 0 && (
        <div className="flex mb-8">
          <div className="flex space-x-2">
            {tiers.map((tier) => (
              <TabButton
                key={tier.id}
                label={tier.name || `Tier ${tiers.indexOf(tier) + 1}`}
                isActive={activeTabId === tier.id}
                onClick={() => setActiveTabId(tier.id)}
                showIndicator={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Display only the active tier */}
      <div className="space-y-6 w-full">
        {tiers.map((tier, index) => (
          <div
            key={tier.id}
            className={`border border-gray-700 rounded-lg p-6 relative ${
              activeTabId === tier.id ? "block" : "hidden"
            }`}
          >
            {isEditMode && !editingTiers[tier.id] && (
              <div className="absolute top-0 right-0 mt-2 mr-2 z-10">
                <div className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs border border-gray-600">
                  View Only
                </div>
              </div>
            )}

            <TierCard
              key={tier.id}
              tier={tier}
              index={index}
              onRemoveTier={removeTier}
              onUpdateTier={updateTierWithTracking}
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
              // Disable inputs when in edit mode and not editing this tier
              disabled={isEditMode && !editingTiers[tier.id]}
            />

            {isEditMode && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    editingTiers[tier.id] && modifiedTiers[tier.id]
                      ? handleSaveTier(tier.id)
                      : toggleTierEditMode(tier.id)
                  }
                  className="py-2 px-6 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium transition-colors"
                >
                  {editingTiers[tier.id]
                    ? modifiedTiers[tier.id]
                      ? "Save Tier Changes"
                      : "Done Editing"
                    : "Edit Tier"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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
