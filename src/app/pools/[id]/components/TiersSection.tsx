import React, { useState } from "react";
import Image from "next/image";
import { Pool, Tier } from "../../../../lib/types";
import CommitConfirmModal from "./CommitConfirmModal";
import {
  fromUSDCBaseUnits,
  formatUSDC,
} from "../../../../lib/contracts/StageDotFunPool";
import {
  STRINGS,
  REWARD_TYPES,
  REWARD_TYPE_ICONS,
} from "../../../../lib/constants/strings";

interface TiersSectionProps {
  pool: Pool;
  tiers: Tier[];
  isLoadingTiers: boolean;
  usdcBalance?: string;
  onRefreshBalance: () => void;
}

// Define the benefit interface to fix type issues
interface Benefit {
  id: string;
  description: string;
  tier_id: string;
}

// Define the reward item interface
interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  metadata?: any;
}

const TiersSection: React.FC<TiersSectionProps> = ({
  pool,
  tiers,
  isLoadingTiers,
  usdcBalance = "0",
  onRefreshBalance,
}) => {
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Helper function to get the appropriate icon for a reward type
  const getRewardIcon = (type: string) => {
    return REWARD_TYPE_ICONS[type] || REWARD_TYPE_ICONS.DEFAULT;
  };

  if (isLoadingTiers) {
    return (
      <div className="w-full flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#836EF9]"></div>
      </div>
    );
  }

  if (!tiers || tiers.length === 0) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <p className="text-center text-white/70">No tiers available</p>
      </div>
    );
  }

  const handleCommit = (tier: Tier) => {
    setSelectedTier(tier);
    setIsConfirmModalOpen(true);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Patron tiers</h2>

      <div className="space-y-4">
        {tiers.map((tier) => {
          // Convert price to human-readable format only for display
          const displayPrice = fromUSDCBaseUnits(BigInt(tier.price));

          // Check if this is a variable price tier
          const isVariablePrice = !!tier.is_variable_price;

          // Get min and max prices for variable price tiers
          const minPrice = tier.min_price
            ? fromUSDCBaseUnits(BigInt(tier.min_price))
            : null;
          const maxPrice = tier.max_price
            ? fromUSDCBaseUnits(BigInt(tier.max_price))
            : null;

          // Improved price display based on tier type
          let priceDisplay: string;

          if (isVariablePrice) {
            if (minPrice !== null && maxPrice !== null) {
              // Full range format for variable pricing
              priceDisplay = `${formatUSDC(minPrice)}-${formatUSDC(
                maxPrice
              )} USDC`;
            } else if (minPrice !== null) {
              // Min price only
              priceDisplay = `${formatUSDC(minPrice)}+ USDC`;
            } else if (maxPrice !== null) {
              // Max price only - simplified to just show the range without "From"
              priceDisplay = `0-${formatUSDC(maxPrice)} USDC`;
            } else {
              // Fallback for fully flexible
              priceDisplay = "Flexible USDC";
            }
          } else {
            // Fixed price format
            priceDisplay = `${formatUSDC(displayPrice)} USDC`;

            // Special case for free tiers
            if (displayPrice === 0) {
              priceDisplay = "Free";
            }
          }

          // Get the patron avatars - take just the first 3
          const patronAvatars = tier.commitments
            ?.slice(0, 3)
            .map((commitment: any) => commitment.user?.avatar_url)
            .filter(Boolean);

          return (
            <div
              key={tier.id}
              className="bg-[#FFFFFF0A] rounded-[16px] overflow-hidden"
            >
              {tier.image_url && (
                <div className="w-full aspect-video relative">
                  <Image
                    src={tier.image_url}
                    alt={tier.name || "Tier"}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">{tier.name}</h3>
                  <span className="text-lg font-semibold">{priceDisplay}</span>
                </div>

                {/* Render tier description as HTML with proper styling */}
                <div
                  className="text-white/70 mb-4 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: tier.description }}
                />

                {/* Show rewards from reward_items with NFT Pass first */}
                <div className="mb-4">
                  <p className="text-sm text-white/60 mb-1">
                    Benefits {(tier.reward_items?.length || 0) + 1}{" "}
                    {/* +1 for NFT Pass */}
                  </p>
                  <ul className="space-y-2">
                    {/* Always show Patron NFT Pass as the first benefit */}
                    <li className="flex items-center">
                      <span className="mr-2">
                        {REWARD_TYPE_ICONS[REWARD_TYPES.NFT]}
                      </span>
                      <span>
                        <span className="font-medium">
                          {STRINGS.PATRON_PASS_NAME(tier.name)}
                        </span>
                        <div className="text-white/70 text-sm">
                          {STRINGS.PATRON_PASS_DESCRIPTION}
                        </div>
                      </span>
                    </li>

                    {/* Show other reward items after the NFT Pass */}
                    {tier.reward_items && tier.reward_items.length > 0
                      ? tier.reward_items.map(
                          (reward: RewardItem, index: number) => (
                            <li key={index} className="flex items-center">
                              <span className="mr-2">
                                {getRewardIcon(reward.type)}
                              </span>
                              <span>
                                <span className="font-medium">
                                  {reward.name}
                                </span>
                                {reward.description && (
                                  <div
                                    className="text-white/70 text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: reward.description,
                                    }}
                                  />
                                )}
                              </span>
                            </li>
                          )
                        )
                      : null}
                  </ul>
                </div>

                {pool.status !== "EXECUTING" &&
                  pool.status !== "FUNDED" &&
                  pool.status !== "FAILED" && (
                    <button
                      className="w-full py-3 bg-[#836EF9] hover:bg-[#6F5BD0] text-white font-medium rounded-lg transition-colors"
                      onClick={() => handleCommit(tier)}
                    >
                      {isVariablePrice
                        ? "Commit Flexible Amount"
                        : displayPrice === 0
                        ? "Join Free Tier"
                        : `Commit for ${formatUSDC(displayPrice)} USDC`}
                    </button>
                  )}

                <div className="mt-3 flex items-center">
                  <div className="flex -space-x-2">
                    {/* Show avatar images instead of gray circles */}
                    {patronAvatars && patronAvatars.length > 0
                      ? patronAvatars.map((avatarUrl: any, i: number) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-[#15161a] overflow-hidden relative"
                          >
                            <Image
                              src={avatarUrl}
                              alt="Patron"
                              layout="fill"
                              objectFit="cover"
                            />
                          </div>
                        ))
                      : // Fallback if no avatars
                        Array.from({
                          length: Math.min(3, tier.commitments?.length || 0),
                        }).map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-gray-400 border border-[#15161a]"
                          ></div>
                        ))}
                  </div>
                  <span className="ml-2 text-sm text-white/70">
                    {tier.commitments?.length || 0} patrons
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTier && (
        <CommitConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          tier={selectedTier}
          pool={pool}
          usdcBalance={usdcBalance}
          onRefreshBalance={onRefreshBalance}
        />
      )}
    </div>
  );
};

export default TiersSection;
