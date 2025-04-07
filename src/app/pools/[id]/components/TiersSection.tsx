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
import { formatAmount } from "@/lib/utils";

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
              // Full range format for variable pricing with K/M formatting
              priceDisplay = `${formatAmount(minPrice)}-${formatAmount(
                maxPrice
              )} USDC`;
            } else if (minPrice !== null) {
              // Min price only with K/M formatting
              priceDisplay = `${formatAmount(minPrice)}+ USDC`;
            } else if (maxPrice !== null) {
              // Max price only with K/M formatting
              priceDisplay = `0-${formatAmount(maxPrice)} USDC`;
            } else {
              // Fallback for fully flexible
              priceDisplay = "Flexible USDC";
            }
          } else {
            // Fixed price format with K/M formatting
            priceDisplay = `${formatAmount(displayPrice)} USDC`;

            // Special case for free tiers
            if (displayPrice === 0) {
              priceDisplay = "Free";
            }
          }

          // Get unique patrons and their avatars
          const uniquePatrons = new Map();
          const totalCommitments = tier.commitments?.length || 0;
          tier.commitments?.forEach((commitment: any) => {
            const address = commitment.user_address.toLowerCase();
            if (!uniquePatrons.has(address)) {
              uniquePatrons.set(address, commitment.user);
            }
          });

          // Get up to 5 unique patron avatars
          const patronAvatars = Array.from(uniquePatrons.values())
            .slice(0, 5)
            .map((user: any) => user?.avatar_url)
            .filter(Boolean);

          // Get patron count and max patrons
          const maxPatrons = tier.max_supply;
          const hasMaxPatrons = maxPatrons && maxPatrons > 0;

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
                {/* Flex container that wraps only when needed */}
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
                  <h3 className="text-lg font-medium">{tier.name}</h3>
                  <span className="text-lg font-semibold text-white/90">
                    {priceDisplay}
                  </span>
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

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {/* Show avatar images only for unique patrons */}
                      {patronAvatars.map((avatarUrl, i) => (
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
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-white/70">
                      {totalCommitments}
                      {hasMaxPatrons ? `/${maxPatrons}` : ""}{" "}
                      {totalCommitments === 1 ? "patron" : "patrons"}
                    </span>
                  </div>
                  {hasMaxPatrons && totalCommitments >= maxPatrons && (
                    <span className="text-sm text-white/50">Tier full</span>
                  )}
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
