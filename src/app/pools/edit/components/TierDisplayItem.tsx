import React from "react";
import { FaEdit } from "react-icons/fa";
import { Tier, RewardItem } from "../../create/types";
import { formatUSDC, fromUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";
import {
  formatRangeDisplay,
  isUncapped,
  MAX_SAFE_VALUE,
} from "@/lib/utils/contractValues";
import { formatAmount } from "@/lib/utils";

interface TierDisplayItemProps {
  tier: Tier;
  onEditTier: (tier: Tier) => void;
}

const TierDisplayItem: React.FC<TierDisplayItemProps> = ({
  tier,
  onEditTier,
}) => {
  // Format the price display based on whether it's variable or fixed
  const getPriceDisplay = () => {
    try {
      // Convert price to human-readable format
      const displayPrice =
        tier.price && /^\d+$/.test(tier.price)
          ? fromUSDCBaseUnits(BigInt(tier.price))
          : 0;

      // Check if this is a variable price tier
      const isVariablePrice = tier.isVariablePrice;

      // Get min and max prices for variable price tiers
      const minPrice =
        tier.minPrice && /^\d+$/.test(tier.minPrice)
          ? fromUSDCBaseUnits(BigInt(tier.minPrice))
          : 0;

      const maxPrice =
        tier.maxPrice && /^\d+$/.test(tier.maxPrice)
          ? fromUSDCBaseUnits(BigInt(tier.maxPrice))
          : 0;

      // Improved price display based on tier type
      if (isVariablePrice) {
        if (minPrice !== null && maxPrice !== null) {
          // Check if this is an uncapped tier
          if (tier.maxPrice === MAX_SAFE_VALUE) {
            // For uncapped pricing, show "Flexible"
            return "Flexible USDC";
          } else {
            // For normal range pricing, show the full range with K/M formatting
            return `${formatAmount(minPrice)}-${formatAmount(maxPrice)} USDC`;
          }
        } else if (minPrice !== null) {
          // If only min price is set
          return "Flexible USDC";
        } else if (maxPrice !== null) {
          // Max price only with K/M formatting
          return `Up to ${formatAmount(maxPrice)} USDC`;
        } else {
          // Fallback for fully flexible
          return "Flexible USDC";
        }
      } else {
        // Fixed price format with K/M formatting
        if (displayPrice === 0) {
          return "Free";
        }
        return `${formatAmount(displayPrice)} USDC`;
      }
    } catch (error) {
      console.error("Error formatting tier price:", error);
      return "$0.00";
    }
  };

  // Format the patron cap display
  const getPatronDisplay = () => {
    try {
      // Check if maxPatrons represents "uncapped"
      if (tier.maxPatrons === MAX_SAFE_VALUE) {
        return "Unlimited patrons";
      } else {
        const maxPatrons =
          tier.maxPatrons && /^\d+$/.test(tier.maxPatrons)
            ? parseInt(tier.maxPatrons)
            : 0;
        return `Max ${maxPatrons} patrons`;
      }
    } catch (error) {
      console.error("Error formatting patron display:", error);
      return "Max 0 patrons";
    }
  };

  // Get actual reward items if they are objects, or display count if they are IDs
  const hasRewards =
    Array.isArray(tier.rewardItems) && tier.rewardItems.length > 0;

  const renderRewardItems = () => {
    if (!hasRewards) return <p className="text-sm text-white/70">No rewards</p>;

    // For string array of IDs
    if (typeof tier.rewardItems[0] === "string") {
      return (
        <p className="text-sm text-white/70">
          {tier.rewardItems.length} reward
          {tier.rewardItems.length !== 1 ? "s" : ""} available
        </p>
      );
    }

    // For array of reward objects
    return (
      <ul className="space-y-2">
        {(tier.rewardItems as unknown as RewardItem[]).map((reward, index) => (
          <li key={index} className="flex items-start">
            <span className="text-[#836EF9] mr-2">•</span>
            <div>
              <div className="font-medium">{reward.name}</div>
              {reward.description && (
                <div className="text-white/70 text-sm">
                  {reward.description}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="bg-[#FFFFFF0A] rounded-lg p-5 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{tier.name}</h3>
        <button
          onClick={() => onEditTier(tier)}
          className="flex items-center gap-2 py-2 px-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white text-sm font-medium transition-colors"
        >
          <FaEdit /> Edit Tier
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-gray-400 text-sm mb-1">Price</p>
          <p className="font-medium text-lg">{getPriceDisplay()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-1">Capacity</p>
          <p className="font-medium text-lg">{getPatronDisplay()}</p>
        </div>
      </div>

      {tier.description && (
        <div className="mb-4 text-white/80">{tier.description}</div>
      )}

      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">Rewards</p>
        {renderRewardItems()}
      </div>

      <div>
        <p className="text-gray-400 text-sm mb-1">Status</p>
        <p
          className={`font-medium ${
            tier.isActive ? "text-green-400" : "text-red-400"
          }`}
        >
          {tier.isActive ? "Active" : "Inactive"}
        </p>
      </div>
    </div>
  );
};

export default TierDisplayItem;
