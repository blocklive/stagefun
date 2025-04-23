import React, { useState, useRef, useEffect, useCallback } from "react";
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
  onAddTierInEditMode?: () => Promise<void>;
  activeTierId?: string | null;
  onActiveTierChange?: (tierId: string | null) => void;
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
  onAddTierInEditMode,
  activeTierId,
  onActiveTierChange,
}) => {
  const [isUploadingImage, setIsUploadingImage] = useState<{
    [key: string]: boolean;
  }>({});
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [showRewardDropdown, setShowRewardDropdown] = useState<string | null>(
    null
  );
  // Add state for local available rewards
  const [localAvailableRewards, setLocalAvailableRewards] = useState<
    RewardItem[]
  >(availableRewardItems || []);

  // Initialize editingTiers with default values to avoid undefined checks
  const [editingTiers, setEditingTiers] = useState<Record<string, boolean>>(
    () => {
      // If in edit mode, initialize all tiers to view-only mode
      if (isEditMode && tiers.length > 0) {
        console.log("⚙️ Initializing editingTiers on component mount");
        const initialState: Record<string, boolean> = {};
        tiers.forEach((tier) => {
          initialState[tier.id] = false; // false = view-only mode
        });
        return initialState;
      }
      return {};
    }
  );

  const [modifiedTiers, setModifiedTiers] = useState<Record<string, boolean>>(
    {}
  );
  // Add state for active tab
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Store the list of tier IDs we've seen to avoid reinitializing already initialized tiers
  const knownTierIds = useRef<Set<string>>(new Set());

  // Track whether we've initialized the tiers to view-only mode
  const hasInitializedRef = useRef(false);

  // Track the previous tier count to detect when a new tier is added
  const prevTierCountRef = useRef(0);

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
    console.log(`🔄 Setting active tab to newly created tier: ${newTier.id}`);
    setActiveTabId(newTier.id);

    // Register this tier ID as known
    knownTierIds.current.add(newTier.id);

    // If not in edit mode, we're done
    if (!isEditMode) return;

    // For edit mode, also set the tier to edit mode and mark as modified
    console.log(`Setting new tier ${newTier.id} to edit mode`);
    setEditingTiers((prev) => ({
      ...prev,
      [newTier.id]: true, // true = edit mode
    }));

    // Mark as modified
    setModifiedTiers((prev) => ({
      ...prev,
      [newTier.id]: true,
    }));

    return newTier;
  }, [
    tiers,
    generateTierName,
    fundingGoal,
    poolImage,
    onTiersChange,
    supabase,
    isEditMode,
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
    console.log(`🗑️ Removing tier ${id}, current active tab: ${activeTabId}`);

    // Set a new active tab if we're removing the active one
    if (activeTabId === id && tiers.length > 1) {
      const currentIndex = tiers.findIndex((t) => t.id === id);
      const newIndex = Math.max(0, currentIndex - 1);
      const newActiveTab = tiers[newIndex].id;

      console.log(`🔄 Setting new active tab to ${newActiveTab} after removal`);
      setActiveTabId(newActiveTab);
    }

    // Remove the tier
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
      console.log("Creating reward:", reward);

      // Use the parent component's function to add reward - it returns the complete reward with ID
      const newReward = onAddRewardItem(reward);
      console.log("New reward created:", newReward);

      // Add the new reward to our local available rewards so it shows up in the UI
      setLocalAvailableRewards((prev) => [...prev, newReward]);

      // Store the reward data in local storage to recover it if needed
      // (this will help when sending to backend)
      try {
        // Using sessionStorage to avoid persistence issues
        const tempRewardsKey = `temp_rewards_${poolName || "unknown"}`;
        const existingData = sessionStorage.getItem(tempRewardsKey) || "{}";
        const tempRewards = JSON.parse(existingData);
        tempRewards[newReward.id] = reward;
        sessionStorage.setItem(tempRewardsKey, JSON.stringify(tempRewards));
      } catch (e) {
        console.error("Failed to save temp reward data to storage:", e);
      }

      // If we have a current tier selected
      if (currentTierId) {
        // Find the tier to update
        const tierToUpdate = tiers.find((t) => t.id === currentTierId);

        if (!tierToUpdate) {
          console.error("No tier found with ID:", currentTierId);
          setShowAddRewardModal(false);
          setCurrentTierId(null);
          return;
        }

        console.log("Adding reward to tier:", {
          tierId: currentTierId,
          rewardId: newReward.id,
          currentRewards: tierToUpdate.rewardItems,
        });

        // Create updated tier with the new reward ID
        const updatedTier = {
          ...tierToUpdate,
          rewardItems: [...(tierToUpdate.rewardItems || []), newReward.id],
          modifiedFields: new Set([
            ...tierToUpdate.modifiedFields,
            "rewardItems",
          ]),
        };

        // Create a new tiers array with the updated tier
        const updatedTiers = tiers.map((t) =>
          t.id === currentTierId ? updatedTier : t
        );

        console.log("Updating tiers with new reward:", {
          updatedTierId: currentTierId,
          updatedRewards: updatedTier.rewardItems,
        });

        // Update tiers state
        onTiersChange(updatedTiers);

        // If in edit mode, mark the tier as modified
        if (isEditMode) {
          setModifiedTiers((prev) => ({
            ...prev,
            [currentTierId]: true,
          }));
        }
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

  // Update editingTiers when activeTierId changes
  useEffect(() => {
    if (isEditMode && activeTierId && onActiveTierChange) {
      // Set all tiers to view mode except the active one
      const updatedEditingTiers: Record<string, boolean> = {};
      tiers.forEach((tier) => {
        updatedEditingTiers[tier.id] = tier.id === activeTierId;
      });
      setEditingTiers(updatedEditingTiers);
    }
  }, [isEditMode, activeTierId, tiers, onActiveTierChange]);

  const toggleTierEditMode = (tierId: string) => {
    if (isEditMode) {
      // In edit mode (with dedicated save button), we need to track which tier is being edited
      if (onActiveTierChange) {
        // If this tier is already active, deactivate it
        if (activeTierId === tierId) {
          onActiveTierChange(null);
          // When disabling edit mode, clear the modified flag
          setModifiedTiers((prev) => {
            const newModified = { ...prev };
            delete newModified[tierId];
            return newModified;
          });
        } else {
          // Otherwise activate this tier
          onActiveTierChange(tierId);
        }
      } else {
        // Fallback to old behavior if onActiveTierChange is not provided
        const newState = !editingTiers[tierId];
        setEditingTiers((prev) => ({
          ...Object.fromEntries(Object.keys(prev).map((id) => [id, false])),
          [tierId]: newState,
        }));

        // When disabling edit mode, clear the modified flag
        if (!newState) {
          setModifiedTiers((prev) => {
            const newModified = { ...prev };
            delete newModified[tierId];
            return newModified;
          });
        }
      }
    } else {
      // Original behavior for create flow - only one tier editable at a time
      const newState = !editingTiers[tierId];
      setEditingTiers((prev) => ({
        ...Object.fromEntries(Object.keys(prev).map((id) => [id, false])),
        [tierId]: newState,
      }));

      // When disabling edit mode, clear the modified flag
      if (!newState) {
        setModifiedTiers((prev) => {
          const newModified = { ...prev };
          delete newModified[tierId];
          return newModified;
        });
      }
    }
  };

  // Wrap the existing updateTier function to track modifications
  const updateTierWithTracking = (
    id: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: string | string[] | boolean
  ) => {
    // Mark this tier as modified if we're in edit mode
    if (isEditMode) {
      // Only track as modified if we're currently editing this tier
      if (editingTiers[id]) {
        // Mark as modified to enable the save button
        setModifiedTiers((prev) => ({
          ...prev,
          [id]: true,
        }));
      }
    }

    // Call the original updateTier function
    updateTier(id, fieldOrFields, value);
  };

  // NEW: Function to handle saving a tier
  const handleSaveTier = async (tierId: string) => {
    if (onSaveTier) {
      try {
        console.log(
          `💾 Saving tier ${tierId}, current edit state:`,
          editingTiers[tierId]
        );

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

        console.log(`✅ Tier ${tierId} saved successfully`);
      } catch (error) {
        console.error(`Error saving tier ${tierId}:`, error);
        showToast.error("Failed to save tier changes");
      }
    } else {
      // If no save handler, just toggle edit mode
      console.log(`No save handler, just toggling tier ${tierId} edit mode`);
      toggleTierEditMode(tierId);
    }
  };

  // Use a SIMPLE EFFECT for FIRST-TIME initialization only
  useEffect(() => {
    // Only run in edit mode and when we have tiers
    if (isEditMode && tiers.length > 0 && !hasInitializedRef.current) {
      // Create view-only state for all tiers
      const viewOnlyState: Record<string, boolean> = {};
      tiers.forEach((tier) => {
        viewOnlyState[tier.id] = false; // false = view-only mode
        knownTierIds.current.add(tier.id);
      });

      // Set all tiers to view-only mode
      setEditingTiers(viewOnlyState);

      // Clear any modified flags
      setModifiedTiers({});

      // Set flag to prevent this from running again
      hasInitializedRef.current = true;
    }
  }, [isEditMode]); // IMPORTANT: tiers is NOT a dependency

  // Effect to handle tier additions in edit mode
  useEffect(() => {
    // Only run in edit mode
    if (!isEditMode) return;

    // Check if a tier count increased
    if (
      tiers.length > prevTierCountRef.current &&
      prevTierCountRef.current > 0
    ) {
      // Find tiers that aren't in our known set
      const newTiers = tiers.filter(
        (tier) => !knownTierIds.current.has(tier.id)
      );

      if (newTiers.length > 0) {
        // Get the last new tier
        const newTier = newTiers[newTiers.length - 1];

        // Set as active tab
        setActiveTabId(newTier.id);

        // Set to edit mode
        setEditingTiers((prev) => ({
          ...prev,
          [newTier.id]: true, // true = edit mode
        }));

        // Mark as modified
        setModifiedTiers((prev) => ({
          ...prev,
          [newTier.id]: true,
        }));

        // Add all new tiers to known set
        newTiers.forEach((tier) => {
          knownTierIds.current.add(tier.id);
        });
      }
    }

    // Update the previous count
    prevTierCountRef.current = tiers.length;
  }, [tiers.length, isEditMode, tiers]);

  // Direct helper to identify the newest tier and set it active
  const findAndActivateNewestTier = () => {
    // Get all currently known tier IDs
    const knownIds = new Set(knownTierIds.current);

    // Get all tiers that aren't in the known set
    const newTiers = tiers.filter((tier) => !knownIds.has(tier.id));

    if (newTiers.length > 0) {
      // Sort by highest onchain_index (newest should have highest index)
      const newestTier = [...newTiers].sort((a, b) => {
        const indexA = a.onchain_index !== undefined ? a.onchain_index : 0;
        const indexB = b.onchain_index !== undefined ? b.onchain_index : 0;
        return indexB - indexA; // Descending order
      })[0];

      // Set as active tab
      setActiveTabId(newestTier.id);

      // Set to edit mode
      setEditingTiers((prev) => ({
        ...prev,
        [newestTier.id]: true,
      }));

      // Mark as modified
      setModifiedTiers((prev) => ({
        ...prev,
        [newestTier.id]: true,
      }));

      // Add all new tiers to known set
      newTiers.forEach((tier) => {
        knownTierIds.current.add(tier.id);
      });

      return newestTier;
    }

    return null;
  };

  // Modified addTier function for edit mode
  const handleAddTierClick = async () => {
    // If in edit mode and onAddTierInEditMode is provided, use it instead
    if (isEditMode && onAddTierInEditMode) {
      try {
        // Save the known tier IDs before adding
        const beforeIds = new Set([...knownTierIds.current]);

        // Call the parent's add tier function
        await onAddTierInEditMode();

        // Wait a tiny bit for React to update state from the parent
        setTimeout(() => {
          findAndActivateNewestTier();
        }, 50);
      } catch (error) {
        console.error(`Error adding tier:`, error);
      }
    } else {
      // Otherwise use the original addTier function
      addTier();
    }
  };

  // Keep localAvailableRewards in sync with props
  useEffect(() => {
    setLocalAvailableRewards((prev) => {
      // Keep newly added rewards (those with temp_ IDs) and add any new rewards from props
      const existingTempRewards = prev.filter((r) => r.id.startsWith("temp_"));
      const nonTempPropRewards = availableRewardItems.filter(
        (r) => !r.id.startsWith("temp_")
      );

      // Combine both arrays, preserving temp rewards we've added locally
      return [...existingTempRewards, ...nonTempPropRewards];
    });
  }, [availableRewardItems]);

  return (
    <div className="mb-12 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tiers</h2>
        <button
          type="button"
          onClick={handleAddTierClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Tier
        </button>
      </div>

      {/* Tabs navigation */}
      {tiers.length > 0 && (
        <div className="flex mb-8">
          <div className="flex space-x-2">
            {/* Sort tiers by onchain_index to ensure chronological order (0, 1, 2, etc.) from left to right */}
            {[...tiers]
              .sort((a, b) => {
                // Sort by onchain_index if available, otherwise use the array order
                const indexA =
                  a.onchain_index !== undefined
                    ? a.onchain_index
                    : tiers.indexOf(a);
                const indexB =
                  b.onchain_index !== undefined
                    ? b.onchain_index
                    : tiers.indexOf(b);
                return indexA - indexB;
              })
              .map((tier) => (
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
              availableRewardItems={localAvailableRewards}
              onCreateNewReward={handleCreateNewReward}
              capAmount={capAmount}
              fundingGoal={fundingGoal}
              // Empty handlers as these are required by the component interface but unused
              onAddReward={(tierId: string) => {}}
              onRemoveReward={(tierId: string, rewardId: string) => {
                // Actually implement removal for existing functionality
                const tierToUpdate = tiers.find((t) => t.id === tierId);
                if (tierToUpdate && tierToUpdate.rewardItems) {
                  // Update the tier without this reward
                  updateTier(tierId, {
                    rewardItems: tierToUpdate.rewardItems.filter(
                      (id) => id !== rewardId
                    ),
                  });

                  // Mark as modified if in edit mode
                  if (isEditMode) {
                    setModifiedTiers((prev) => ({
                      ...prev,
                      [tierId]: true,
                    }));
                  }
                }
              }}
              onUpdateReward={(
                tierId: string,
                rewardId: string,
                field: keyof RewardItem,
                value: string
              ) => {}}
              // Disable inputs when in edit mode and not editing this tier
              disabled={isEditMode && !editingTiers[tier.id]}
            />

            {isEditMode && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (editingTiers[tier.id] && modifiedTiers[tier.id]) {
                      handleSaveTier(tier.id);
                    } else {
                      toggleTierEditMode(tier.id);
                    }
                  }}
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
