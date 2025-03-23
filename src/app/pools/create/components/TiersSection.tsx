import React, { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTierImage } from "@/lib/utils/imageUpload";

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
  hasBeenEdited?: boolean;
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
  supabase: SupabaseClient;
  poolName?: string;
  fundingGoal?: string;
  poolImage?: string;
}

export const TiersSection: React.FC<TiersSectionProps> = ({
  tiers,
  onTiersChange,
  availableRewardItems,
  supabase,
  poolName,
  fundingGoal,
  poolImage,
}) => {
  const [isUploadingImage, setIsUploadingImage] = useState<{
    [key: string]: boolean;
  }>({});

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
        attributes: [
          {
            trait_type: "Tier",
            value: defaultName,
          },
        ],
      };
      // Convert metadata to a data URL
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
      description: "",
      rewardItems: [],
      imageUrl: poolImage,
      hasBeenEdited: false,
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
          return {
            ...tier,
            [field]: value,
            hasBeenEdited: true, // Mark as edited when any field is updated
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
        updateTier(tierId, "imageUrl", imageUrl);
        updateTier(tierId, "nftMetadata", metadataUrl);
      }
    } catch (error) {
      console.error("Failed to upload tier image:", error);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Tiers</h2>
        <button
          type="button"
          onClick={addTier}
          className="flex items-center gap-2 px-4 py-2 bg-[#836EF9] text-white rounded-lg hover:bg-[#6B4EF9] transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Tier
        </button>
      </div>

      <div className="space-y-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="p-6 bg-[#FFFFFF14] rounded-lg border border-[#FFFFFF1A]"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Tier Details</h3>
              <button
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
                    <input
                      type="number"
                      value={tier.minPrice}
                      onChange={(e) =>
                        updateTier(tier.id, "minPrice", e.target.value)
                      }
                      className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Maximum Price (USDC)
                    </label>
                    <input
                      type="number"
                      value={tier.maxPrice}
                      onChange={(e) =>
                        updateTier(tier.id, "maxPrice", e.target.value)
                      }
                      className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Fixed Price (USDC)
                  </label>
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) =>
                      updateTier(tier.id, "price", e.target.value)
                    }
                    className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Patrons
                </label>
                <input
                  type="number"
                  value={tier.maxPatrons}
                  onChange={(e) =>
                    updateTier(tier.id, "maxPatrons", e.target.value)
                  }
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  placeholder="0 for unlimited"
                  min="0"
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
                Reward Items
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-[#FFFFFF1A] rounded-lg">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 text-[#836EF9] rounded focus:ring-[#836EF9] opacity-50"
                  />
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

                {availableRewardItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-3 bg-[#FFFFFF14] rounded-lg hover:bg-[#FFFFFF1A] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={tier.rewardItems.includes(item.id)}
                      onChange={(e) => {
                        const newRewardItems = e.target.checked
                          ? [...tier.rewardItems, item.id]
                          : tier.rewardItems.filter((id) => id !== item.id);
                        updateTier(tier.id, "rewardItems", newRewardItems);
                      }}
                      className="w-4 h-4 text-[#836EF9] rounded focus:ring-[#836EF9]"
                    />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-400">
                        {item.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
