import React, { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Tier {
  id: string;
  name: string;
  description: string;
  price: string;
  maxSupply: string;
  rewardItems: string[];
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
}

export const TiersSection: React.FC<TiersSectionProps> = ({
  tiers,
  onTiersChange,
  availableRewardItems,
}) => {
  const addTier = () => {
    const newTier: Tier = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      price: "",
      maxSupply: "",
      rewardItems: [],
    };
    onTiersChange([...tiers, newTier]);
  };

  const removeTier = (id: string) => {
    onTiersChange(tiers.filter((tier) => tier.id !== id));
  };

  const updateTier = (
    id: string,
    field: keyof Tier,
    value: string | string[]
  ) => {
    onTiersChange(
      tiers.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier))
    );
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Tiers</h2>
        <button
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
                  Price (USDC)
                </label>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => updateTier(tier.id, "price", e.target.value)}
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Supply
                </label>
                <input
                  type="number"
                  value={tier.maxSupply}
                  onChange={(e) =>
                    updateTier(tier.id, "maxSupply", e.target.value)
                  }
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
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
