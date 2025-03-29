import React, { useState, useRef, useEffect } from "react";
import {
  CheckIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Tier, RewardItem } from "../../types";

interface TierRewardsListProps {
  tier: Tier;
  availableRewardItems: RewardItem[];
  onUpdateTier: (tierId: string, field: keyof Tier, value: any) => void;
  onCreateNewReward: (tierId: string) => void;
}

export const TierRewardsList: React.FC<TierRewardsListProps> = ({
  tier,
  availableRewardItems,
  onUpdateTier,
  onCreateNewReward,
}) => {
  const [showRewardDropdown, setShowRewardDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowRewardDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter out rewards that are already added to the tier
  const getAvailableRewardsForTier = () => {
    return availableRewardItems.filter(
      (item) => !tier.rewardItems.includes(item.id)
    );
  };

  const handleAddExistingReward = (rewardId: string) => {
    // Create a copy of the current reward items and add the new one
    const updatedRewardItems = [...tier.rewardItems, rewardId];

    // Update the tier
    onUpdateTier(tier.id, "rewardItems", updatedRewardItems);

    // Close the dropdown
    setShowRewardDropdown(false);
  };

  const handleRemoveReward = (rewardId: string) => {
    // Filter out the reward to remove
    const updatedRewardItems = tier.rewardItems.filter((id) => id !== rewardId);

    // Update the tier
    onUpdateTier(tier.id, "rewardItems", updatedRewardItems);
  };

  return (
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
        {tier.rewardItems.length > 0 &&
          availableRewardItems
            .filter((item) => tier.rewardItems.includes(item.id))
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-800/10"
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
                  onClick={() => handleRemoveReward(item.id)}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowRewardDropdown(!showRewardDropdown);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-[#836EF9] transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Reward
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${
                showRewardDropdown ? "transform rotate-180" : ""
              }`}
            />
          </button>

          {/* Custom Dropdown */}
          {showRewardDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden z-10">
              {/* Create New Reward Option */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCreateNewReward(tier.id);
                  setShowRewardDropdown(false);
                }}
                className="w-full flex items-center gap-2 p-3 hover:bg-[#FFFFFF0A] text-[#836EF9] transition-colors border-b border-[#FFFFFF1A]"
              >
                <PlusIcon className="w-5 h-5" />
                Create New Reward
              </button>

              {/* Available Rewards */}
              <div className="max-h-48 overflow-y-auto">
                {getAvailableRewardsForTier().length > 0 ? (
                  getAvailableRewardsForTier().map((item) => (
                    <div
                      key={item.id}
                      className="w-full flex items-center gap-2 p-3 hover:bg-[#FFFFFF0A] text-white transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddExistingReward(item.id);
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
  );
};
