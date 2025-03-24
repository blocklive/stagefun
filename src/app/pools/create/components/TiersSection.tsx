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

interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
  nftMetadata: string;
  isVariablePrice: boolean;
  minPrice: string;
  maxPrice: string;
  maxPatrons: string;
  description: string;
  rewardItems: string[];
  imageUrl?: string;
  modifiedFields: Set<keyof Tier>;
}

interface TiersSectionProps {
  tiers: Tier[];
  onTiersChange: (tiers: Tier[]) => void;
  availableRewardItems: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
  }>;
  onAddRewardItem: (reward: Omit<RewardItem, "id">) => void;
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowRewardDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Function to generate a default tier name based on tier number
  const generateTierName = (tierNumber: number): string => {
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

    // If it's the first and only tier, give it a special name
    if (tierNumber === 1 && tiers.length === 0) {
      return "GM";
    }

    if (tierNumber <= tierNames.length) {
      return tierNames[tierNumber - 1];
    }

    return `GM ${tierNumber}`;
  };

  // Create first tier automatically
  useEffect(() => {
    if (tiers.length === 0) {
      addTier();
    }
  }, []);

  // Update unmodified fields when dependencies change
  useEffect(() => {
    const updatedTiers = tiers.map((tier) => {
      const updates: Partial<Tier> = {};

      // Update name if not modified and pool name changes
      if (!tier.modifiedFields.has("name") && poolName) {
        updates.name = generateTierName(1);
        updates.description = `${updates.name} tier for ${poolName}`;
      }

      // Update price and max patrons if not modified and funding goal changes
      if (!tier.modifiedFields.has("price") && fundingGoal) {
        const goalAmount = parseFloat(fundingGoal);
        if (!isNaN(goalAmount)) {
          updates.price = (goalAmount * 0.01).toString();

          if (!tier.modifiedFields.has("maxPatrons")) {
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
      if (!tier.modifiedFields.has("imageUrl") && poolImage) {
        updates.imageUrl = poolImage;

        const metadata = {
          name: tier.name,
          description: `${tier.name} Tier NFT`,
          image: poolImage,
          tier: tier.name,
          attributes: [{ trait_type: "Tier", value: tier.name }],
        };
        updates.nftMetadata = `data:application/json;base64,${btoa(
          JSON.stringify(metadata)
        )}`;
      }

      // Only update if we have changes
      if (Object.keys(updates).length > 0) {
        return { ...tier, ...updates };
      }
      return tier;
    });

    if (JSON.stringify(updatedTiers) !== JSON.stringify(tiers)) {
      onTiersChange(updatedTiers);
    }
  }, [poolName, fundingGoal, poolImage]);

  const addTier = () => {
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

    // Create metadata JSON if we have a pool image
    let metadataUrl = "";
    if (poolImage) {
      const metadata = {
        name: defaultName,
        description: `${defaultName} Tier NFT`,
        image: poolImage,
        tier: defaultName,
        attributes: [{ trait_type: "Tier", value: defaultName }],
      };
      metadataUrl = `data:application/json;base64,${btoa(
        JSON.stringify(metadata)
      )}`;
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
      description: `${defaultName} tier for ${poolName || "this pool"}`,
      rewardItems: [],
      imageUrl: poolImage,
      modifiedFields: new Set(),
    };
    onTiersChange([...tiers, newTier]);
  };

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
    const updatedTiers = tiers.map((tier) => {
      if (tier.id === tierId) {
        return {
          ...tier,
          rewardItems: [...tier.rewardItems, rewardId],
        };
      }
      return tier;
    });
    onTiersChange(updatedTiers);
    setShowRewardDropdown(null);
  };

  // Filter out rewards that are already added to the tier
  const getAvailableRewardsForTier = (tier: Tier) => {
    return availableRewardItems.filter(
      (item) => !tier.rewardItems.includes(item.id)
    );
  };

  return (
    <div className="bg-[#FFFFFF0A] p-6 rounded-[16px] mb-6">
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
        {tiers.map((tier) => (
          <div key={tier.id} className="bg-[#FFFFFF0A] p-6 rounded-lg relative">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Tier Details</h3>
              <button
                type="button"
                onClick={() => removeTier(tier.id)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  placeholder="e.g., VIP Access"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tier Image
                </label>
                <div className="flex items-center space-x-4">
                  {tier.imageUrl ? (
                    <div className="relative w-24 h-24">
                      <img
                        src={tier.imageUrl}
                        alt={tier.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateTier(tier.id, "imageUrl", "");
                          updateTier(tier.id, "nftMetadata", "");
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, tier.id)}
                        className="hidden"
                        id={`tier-image-${tier.id}`}
                      />
                      <label
                        htmlFor={`tier-image-${tier.id}`}
                        className="cursor-pointer flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-400 rounded-lg hover:border-[#836EF9] transition-colors"
                      >
                        {isUploadingImage[tier.id] ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#836EF9]"></div>
                        ) : (
                          <PlusIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Variable Price
                </label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={tier.isVariablePrice}
                    onChange={(e) =>
                      updateTier(tier.id, "isVariablePrice", e.target.checked)
                    }
                    className="w-4 h-4 text-[#836EF9] rounded focus:ring-[#836EF9]"
                  />
                  <span className="ml-2 text-sm text-gray-400">
                    Allow custom amounts within a range
                  </span>
                </div>
              </div>

              {tier.isVariablePrice ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Minimum Price (USDC)
                    </label>
                    <NumberInput
                      value={tier.minPrice}
                      onChange={(value) =>
                        updateTier(tier.id, "minPrice", value)
                      }
                      placeholder="0"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Maximum Price (USDC)
                    </label>
                    <NumberInput
                      value={tier.maxPrice}
                      onChange={(value) =>
                        updateTier(tier.id, "maxPrice", value)
                      }
                      placeholder="0"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Fixed Price (USDC)
                  </label>
                  <NumberInput
                    value={tier.price}
                    onChange={(value) => updateTier(tier.id, "price", value)}
                    placeholder="0"
                    min={0}
                    step={0.01}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Patrons
                </label>
                <NumberInput
                  value={tier.maxPatrons}
                  onChange={(value) => updateTier(tier.id, "maxPatrons", value)}
                  placeholder="0 for unlimited"
                  min={0}
                  step={1}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={tier.description}
                  onChange={(e) =>
                    updateTier(tier.id, "description", e.target.value)
                  }
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  placeholder="Describe what this tier includes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Rewards
              </label>
              <div className="space-y-2">
                {/* Default NFT reward */}
                <div className="flex items-center justify-between p-3 bg-[#FFFFFF1A] rounded-lg">
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
                      className="flex items-center justify-between p-3 bg-[#FFFFFF1A] rounded-lg"
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
                <div className="flex justify-start relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setShowRewardDropdown(
                        showRewardDropdown === tier.id ? null : tier.id
                      )
                    }
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
                            <button
                              key={item.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectReward(tier.id, item.id);
                              }}
                              className="w-full flex items-center gap-2 p-3 hover:bg-[#FFFFFF0A] text-white transition-colors"
                            >
                              <div className="flex-1 text-left">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-400 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </button>
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
