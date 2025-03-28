import React, { useState, useRef, useEffect } from "react";
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTierImage } from "@/lib/utils/imageUpload";
import { AddRewardModal } from "./AddRewardModal";
import NumberInput from "@/app/components/NumberInput";
import RichTextEditor from "@/app/components/RichTextEditor";
import Image from "next/image";
import { Tier, RewardItem } from "../types";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

interface TiersSectionProps {
  tiers: Tier[];
  onTiersChange: (tiers: Tier[]) => void;
  availableRewardItems: RewardItem[];
  onAddRewardItem: (item: Omit<RewardItem, "id">) => void;
  supabase: SupabaseClient;
  poolName?: string;
  fundingGoal?: string;
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

    // Calculate default price as 1% of funding goal
    let defaultPrice = "0";
    if (fundingGoal) {
      const goalAmount = parseFloat(fundingGoal);
      if (!isNaN(goalAmount)) {
        defaultPrice = (goalAmount * 0.01).toString();
      }
    }

    // Calculate default max patrons based on funding goal and price
    let defaultMaxPatrons = "0";
    if (fundingGoal && defaultPrice) {
      const goalAmount = parseFloat(fundingGoal);
      const priceAmount = parseFloat(defaultPrice);
      if (!isNaN(goalAmount) && !isNaN(priceAmount) && priceAmount > 0) {
        defaultMaxPatrons = Math.ceil(goalAmount / priceAmount).toString();
      }
    }

    // Create metadata and upload to Supabase if we have a pool image
    let metadataUrl = "";
    let imageUrl = "";
    if (poolImage) {
      try {
        console.log("Starting tier image creation with pool image:", poolImage);

        // Check if poolImage is already a blob URL
        if (poolImage.startsWith("blob:")) {
          console.log("Pool image is a blob URL, creating file directly");
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
        } else {
          // If it's a regular URL (e.g., from Supabase storage)
          console.log("Using pool image directly:", poolImage);
          imageUrl = poolImage;

          // Create and upload only the metadata
          const metadata = {
            name: defaultName,
            description: `${defaultName} Tier NFT`,
            image: poolImage,
            tier: defaultName,
            attributes: [{ trait_type: "Tier", value: defaultName }],
          };

          const metadataFileName = `${Math.random()
            .toString(36)
            .substring(2)}_${Date.now()}_metadata.json`;
          const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
            type: "application/json",
          });

          const { data: metadataData, error: metadataError } =
            await supabase.storage
              .from("pool-images")
              .upload(metadataFileName, metadataBlob, {
                cacheControl: "3600",
                upsert: false,
                contentType: "application/json",
              });

          if (metadataError) {
            throw new Error(
              `Failed to upload metadata: ${metadataError.message}`
            );
          }

          const {
            data: { publicUrl: uploadedMetadataUrl },
          } = supabase.storage
            .from("pool-images")
            .getPublicUrl(metadataFileName);

          metadataUrl = uploadedMetadataUrl;
        }

        console.log("Successfully created tier with:", {
          imageUrl,
          metadataUrl,
          defaultName,
        });
      } catch (error) {
        console.error("Detailed error creating tier:", error);
        toast.error("Failed to upload tier image and metadata");
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
      imageUrl: imageUrl || poolImage,
      modifiedFields: new Set(),
    };
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
    const updateTierMetadata = async (tier: Tier) => {
      if (!tier.modifiedFields.has("imageUrl") && poolImage && !tier.imageUrl) {
        try {
          console.log("Starting tier metadata update for tier:", tier.name);
          console.log("Pool image:", poolImage);

          // Create metadata JSON
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
          const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
            type: "application/json",
          });

          const { data: metadataData, error: metadataError } =
            await supabase.storage
              .from("pool-images")
              .upload(metadataFileName, metadataBlob, {
                cacheControl: "3600",
                upsert: false,
              });

          if (metadataError) {
            throw new Error(
              `Failed to upload metadata: ${metadataError.message}`
            );
          }

          // Get the public URL for the metadata
          const {
            data: { publicUrl: metadataUrl },
          } = supabase.storage
            .from("pool-images")
            .getPublicUrl(metadataFileName);

          console.log("Upload successful, metadata URL:", metadataUrl);
          return {
            imageUrl: poolImage,
            nftMetadata: metadataUrl,
          };
        } catch (error) {
          console.error("Detailed error in updateTierMetadata:", error);
          toast.error("Failed to upload tier metadata");
          return null;
        }
      }
      return null;
    };

    const updateTiers = async () => {
      const updatedTiers = await Promise.all(
        tiers.map(async (tier, index) => {
          const updates: Partial<Tier> = {};

          // Only update name if it's the first tier and hasn't been modified
          if (index === 0 && !tier.modifiedFields.has("name") && !tier.name) {
            updates.name = generateTierName(1);
          }

          // Update price and max patrons if not modified and funding goal changes
          if (
            !tier.modifiedFields.has("price") &&
            fundingGoal &&
            (!tier.price || tier.price === "0")
          ) {
            const goalAmount = parseFloat(fundingGoal);
            if (!isNaN(goalAmount)) {
              updates.price = (goalAmount * 0.01).toString();

              if (
                !tier.modifiedFields.has("maxPatrons") &&
                (!tier.maxPatrons || tier.maxPatrons === "0")
              ) {
                const priceAmount = parseFloat(updates.price);
                if (!isNaN(priceAmount) && priceAmount > 0) {
                  updates.maxPatrons = Math.ceil(
                    goalAmount / priceAmount
                  ).toString();
                }
              }
            }
          }

          // Update image and metadata if not modified and pool image changes
          const metadataUpdates = await updateTierMetadata(tier);
          if (metadataUpdates) {
            updates.imageUrl = metadataUpdates.imageUrl;
            updates.nftMetadata = metadataUpdates.nftMetadata;
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
    field: keyof Tier,
    value: string | string[] | boolean
  ) => {
    onTiersChange(
      tiers.map((tier) => {
        if (tier.id === id) {
          // Add the field to modifiedFields when user updates it
          const modifiedFields = new Set(tier.modifiedFields);
          modifiedFields.add(field);

          return {
            ...tier,
            [field]: value,
            modifiedFields,
          };
        }
        return tier;
      })
    );
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tierId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tier = tiers.find((t) => t.id === tierId);
    if (!tier?.name) {
      alert("Please enter a tier name before uploading an image");
      return;
    }

    setIsUploadingImage((prev) => ({ ...prev, [tierId]: true }));

    try {
      const { imageUrl, metadataUrl } = await uploadTierImage(
        file,
        tier.name,
        supabase,
        (isUploading) =>
          setIsUploadingImage((prev) => ({ ...prev, [tierId]: isUploading }))
      );

      if (imageUrl && metadataUrl) {
        // Mark both fields as modified when user uploads an image
        const modifiedFields = new Set(tier.modifiedFields);
        modifiedFields.add("imageUrl");
        modifiedFields.add("nftMetadata");

        onTiersChange(
          tiers.map((t) => {
            if (t.id === tierId) {
              return {
                ...t,
                imageUrl,
                nftMetadata: metadataUrl,
                modifiedFields,
              };
            }
            return t;
          })
        );
      } else {
        throw new Error("Failed to get URLs after upload");
      }
    } catch (error) {
      console.error("Failed to upload tier image:", error);
      alert("Failed to upload image. Please try again.");
      const input = document.getElementById(
        `tier-image-${tierId}`
      ) as HTMLInputElement;
      if (input) input.value = "";
    } finally {
      setIsUploadingImage((prev) => ({ ...prev, [tierId]: false }));
    }
  };

  const handleAddReward = async (reward: Omit<RewardItem, "id">) => {
    // Generate a unique ID for the new reward
    const newRewardId = crypto.randomUUID();

    // Add to available rewards with the generated ID
    onAddRewardItem({ ...reward, id: newRewardId } as RewardItem);

    // Add the reward to the current tier's rewards
    if (currentTierId) {
      const updatedTiers = tiers.map((tier) => {
        if (tier.id === currentTierId) {
          return {
            ...tier,
            rewardItems: [...tier.rewardItems, newRewardId],
          };
        }
        return tier;
      });
      onTiersChange(updatedTiers);
    }

    setShowAddRewardModal(false);
    setCurrentTierId(null);
  };

  const handleSelectReward = (tierId: string, rewardId: string) => {
    // Enhanced logging to debug the issue
    console.log("=== REWARD SELECTION DEBUG ===");
    console.log(`Selecting reward ${rewardId} for tier ${tierId}`);

    // Log the original tiers state
    console.log(
      "Original tiers:",
      JSON.stringify(
        tiers,
        (key, value) => {
          if (key === "modifiedFields" && value instanceof Set) {
            return Array.from(value);
          }
          return value;
        },
        2
      )
    );

    // Find the tier and log its current state
    const targetTier = tiers.find((tier) => tier.id === tierId);
    console.log(
      `Target tier "${targetTier?.name}" current rewardItems:`,
      targetTier?.rewardItems
    );

    // Get the reward details for logging
    const reward = availableRewardItems.find((item) => item.id === rewardId);
    console.log(`Adding reward: ${reward?.name} (${rewardId})`);

    // Create a deep copy of the tiers array
    const updatedTiers = tiers.map((tier) => {
      if (tier.id === tierId) {
        // Make sure we're not duplicating the reward
        if (!tier.rewardItems.includes(rewardId)) {
          console.log(`Adding reward ${rewardId} to tier ${tier.name}`);
          return {
            ...tier,
            rewardItems: [...tier.rewardItems, rewardId],
          };
        } else {
          console.log(`Reward ${rewardId} already exists in tier ${tier.name}`);
          return tier;
        }
      }
      return tier;
    });

    // Log the updated tiers
    console.log(
      "Updated tiers:",
      JSON.stringify(
        updatedTiers,
        (key, value) => {
          if (key === "modifiedFields" && value instanceof Set) {
            return Array.from(value);
          }
          return value;
        },
        2
      )
    );

    // Update the state
    onTiersChange(updatedTiers);

    // Close the dropdown
    setShowRewardDropdown(null);

    console.log("=== END REWARD SELECTION DEBUG ===");
  };

  // Filter out rewards that are already added to the tier
  const getAvailableRewardsForTier = (tier: Tier) => {
    return availableRewardItems.filter(
      (item) => !tier.rewardItems.includes(item.id)
    );
  };

  return (
    <div className="mb-12">
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

      <div className="space-y-6">
        {tiers.map((tier, index) => (
          <div key={tier.id}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">
                Tier {index + 1} Details
              </h3>
              <button
                type="button"
                onClick={() => removeTier(tier.id)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Right side - Tier image - Moved up and reordered for mobile */}
              <div className="order-first md:order-last w-full md:w-[200px] h-[200px]">
                <div className="relative w-full h-full rounded-lg overflow-hidden bg-[#FFFFFF14] group">
                  {tier.imageUrl ? (
                    <Image
                      src={tier.imageUrl}
                      alt={`${tier.name} tier image`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 200px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                      <div className="text-2xl font-bold text-[#836EF9] opacity-50">
                        {tier.name || "TIER"} ACCESS
                      </div>
                    </div>
                  )}
                  <label
                    htmlFor={`tier-image-${tier.id}`}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <input
                      id={`tier-image-${tier.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, tier.id)}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                      <span className="text-white">
                        {isUploadingImage[tier.id]
                          ? "Uploading..."
                          : tier.imageUrl
                          ? "Change Image"
                          : "Upload Image"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Left side - Tier details grid */}
              <div className="order-last md:order-first flex-1 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) =>
                      updateTier(tier.id, "name", e.target.value)
                    }
                    className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    placeholder="e.g., VIP Access"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {tier.isVariablePrice
                      ? "Price Range (USDC)"
                      : "Fixed Price (USDC)"}
                  </label>
                  <div className="flex items-center gap-2">
                    {tier.isVariablePrice ? (
                      <>
                        <NumberInput
                          value={tier.minPrice}
                          onChange={(value) => {
                            // If value is empty, set it to "0"
                            const newValue = value === "" ? "0" : value;
                            updateTier(tier.id, "minPrice", newValue);
                          }}
                          placeholder="Min"
                          min={0}
                          step={0.01}
                        />
                        <span className="text-gray-400">to</span>
                        <NumberInput
                          value={tier.maxPrice}
                          onChange={(value) =>
                            updateTier(tier.id, "maxPrice", value)
                          }
                          placeholder="Max"
                          min={0}
                          step={0.01}
                        />
                      </>
                    ) : (
                      <NumberInput
                        value={tier.price}
                        onChange={(value) =>
                          updateTier(tier.id, "price", value)
                        }
                        placeholder="0"
                        min={0}
                        step={0.01}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Max Patrons
                  </label>
                  <NumberInput
                    value={tier.maxPatrons}
                    onChange={(value) =>
                      updateTier(tier.id, "maxPatrons", value)
                    }
                    placeholder="0 for unlimited"
                    min={0}
                    step={1}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={tier.isVariablePrice}
                        onChange={(e) =>
                          updateTier(
                            tier.id,
                            "isVariablePrice",
                            e.target.checked
                          )
                        }
                      />
                      <div
                        className={`w-10 h-6 rounded-full shadow-inner transition-colors ${
                          tier.isVariablePrice ? "bg-[#836EF9]" : "bg-gray-600"
                        }`}
                      ></div>
                      <div
                        className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          tier.isVariablePrice
                            ? "translate-x-4"
                            : "translate-x-1"
                        } top-1`}
                      ></div>
                    </div>
                    <span className="ml-3 text-sm text-gray-400">
                      Allow custom amounts within a range
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tier Description
              </label>
              <RichTextEditor
                content={tier.description}
                onChange={(value) => updateTier(tier.id, "description", value)}
                placeholder="Describe what this tier includes..."
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Rewards
              </label>
              <div className="space-y-2">
                {/* Default NFT reward */}
                <div className="flex items-center justify-between p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-[#836EF9]" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {tier.name || "Tier"} Patron NFT
                        <span className="text-xs bg-[#836EF9] px-2 py-1 rounded">
                          Included
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Unique NFT proving your membership in this tier
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reward Items - Only show rewards that belong to this tier */}
                {availableRewardItems
                  .filter((item) => tier.rewardItems.includes(item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-[#836EF9]" />
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-400">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newRewardItems = tier.rewardItems.filter(
                            (id) => id !== item.id
                          );
                          updateTier(tier.id, "rewardItems", newRewardItems);
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                {/* Add New Reward Button with Dropdown */}
                <div
                  className="flex justify-start relative"
                  ref={(el) => {
                    registerDropdownRef(tier.id, el);
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        `Toggling dropdown for tier ${tier.name} (${tier.id})`
                      );

                      // Toggle dropdown for this tier only
                      if (showRewardDropdown === tier.id) {
                        setShowRewardDropdown(null);
                      } else {
                        setShowRewardDropdown(tier.id);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-[#836EF9] transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Reward
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform ${
                        showRewardDropdown === tier.id
                          ? "transform rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {/* Custom Dropdown */}
                  {showRewardDropdown === tier.id && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden z-10">
                      {/* Create New Reward Option */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(
                            `Creating new reward for tier ${tier.name} (${tier.id})`
                          );
                          setCurrentTierId(tier.id);
                          setShowAddRewardModal(true);
                          setShowRewardDropdown(null);
                        }}
                        className="w-full flex items-center gap-2 p-3 hover:bg-[#FFFFFF0A] text-[#836EF9] transition-colors border-b border-[#FFFFFF1A]"
                      >
                        <PlusIcon className="w-5 h-5" />
                        Create New Reward
                      </button>

                      {/* Available Rewards */}
                      <div className="max-h-48 overflow-y-auto">
                        {getAvailableRewardsForTier(tier).length > 0 ? (
                          getAvailableRewardsForTier(tier).map((item) => (
                            <div
                              key={item.id}
                              className="w-full flex items-center gap-2 p-3 hover:bg-[#FFFFFF0A] text-white transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault(); // Prevent default behavior
                                e.stopPropagation(); // Don't let event bubble
                                console.log(
                                  `Clicking reward ${item.name} (${item.id}) for tier ${tier.name} (${tier.id})`
                                );

                                // Directly update the tier here for immediate feedback
                                const updatedTiers = tiers.map((t) => {
                                  if (
                                    t.id === tier.id &&
                                    !t.rewardItems.includes(item.id)
                                  ) {
                                    console.log(
                                      `Directly adding reward ${item.id} to tier ${t.name}`
                                    );
                                    return {
                                      ...t,
                                      rewardItems: [...t.rewardItems, item.id],
                                    };
                                  }
                                  return t;
                                });

                                // Update state
                                onTiersChange(updatedTiers);

                                // Close dropdown
                                setShowRewardDropdown(null);
                              }}
                            >
                              <div className="flex-1 text-left">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-400 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-gray-400 text-sm text-center">
                            No available rewards
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
