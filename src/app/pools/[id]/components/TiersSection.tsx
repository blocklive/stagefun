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
import UserAvatar from "@/app/components/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  getDisplayStatus,
  getPoolEffectiveStatus,
} from "../../../../lib/contracts/types";
import {
  formatRangeDisplay,
  isUncapped,
  formatCommitmentCounter,
} from "@/lib/utils/contractValues";
import TierCommits from "./TierCommits";

interface TiersSectionProps {
  pool: Pool;
  tiers: Tier[];
  isLoadingTiers: boolean;
  usdcBalance: string;
  onRefreshBalance?: () => void;
  userId?: string;
  onCommitSuccess?: () => void;
  isAuthenticated?: boolean;
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
  userId,
  onCommitSuccess,
  isAuthenticated = true, // Default to true for backward compatibility
}) => {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showAllTiers, setShowAllTiers] = useState(false);

  // Check if the current user has committed to any tiers
  const hasCommitments = tiers.some((tier) =>
    tier.commitments?.some((commitment) => commitment.user?.id === userId)
  );

  // Get user's commitments for each tier
  const getUserCommitmentForTier = (tier: Tier) => {
    return tier.commitments?.find(
      (commitment) => commitment.user?.id === userId
    );
  };

  // Determine if a tier should be shown
  const shouldShowTier = (tier: Tier) => {
    if (!hasCommitments) return true; // Show all tiers if user hasn't committed
    const userCommitment = getUserCommitmentForTier(tier);
    return showAllTiers || userCommitment !== undefined;
  };

  // Filter tiers to show
  const visibleTiers = tiers.filter(shouldShowTier);

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
    // If not authenticated, redirect to login page
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    // Otherwise proceed with normal flow
    setSelectedTier(tier);
    setIsConfirmModalOpen(true);
  };

  // Get the effective display status as the single source of truth
  const effectiveStatus = getPoolEffectiveStatus(pool);

  return (
    <div className="w-full">
      <div
        onClick={() => hasCommitments && setShowAllTiers(!showAllTiers)}
        className={`flex items-center mb-4 ${
          hasCommitments ? "cursor-pointer hover:opacity-80" : ""
        }`}
      >
        <h2 className="text-xl font-semibold">Patron tiers</h2>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {visibleTiers.map((tier) => {
            const userCommitment = getUserCommitmentForTier(tier);
            const isCommitted = userCommitment !== undefined;

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
                // Check if this is an uncapped tier
                if (tier.max_price && isUncapped(tier.max_price.toString())) {
                  // For uncapped pricing, just show "Flexible" without any price values
                  priceDisplay = "Flexible USDC";
                } else {
                  // For normal range pricing, show the full range
                  priceDisplay = `${formatAmount(minPrice)}-${formatAmount(
                    maxPrice
                  )} USDC`;
                }
              } else if (minPrice !== null) {
                // If only min price is set but we don't want to show it
                priceDisplay = "Flexible USDC";
              } else if (maxPrice !== null) {
                // Max price only with K/M formatting
                priceDisplay = `Up to ${formatAmount(maxPrice)} USDC`;
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

            // Get up to 5 unique patrons
            const patronList = Array.from(uniquePatrons.values()).slice(0, 5);

            // Get patron count and max patrons
            const maxPatrons = tier.max_supply;
            const hasMaxPatrons = maxPatrons && maxPatrons > 0;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <div className="p-4 bg-[#FFFFFF0A] rounded-[16px]">
                  {/* Show "You're in!" badge for committed tiers */}
                  {isCommitted && (
                    <div className="mb-3 px-3 py-2 bg-[#1E1F23] text-white rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Image
                          src="/icons/ic-verification-checkmark.svg"
                          alt="Success"
                          width={20}
                          height={20}
                        />
                        <div className="font-medium">You're In!</div>
                      </div>
                      <div className="text-sm text-white/70">
                        Congratulations! Your LP tokens have been allocated and
                        Patron Pass minted for this pool.
                      </div>
                    </div>
                  )}

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

                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
                    <h3 className="text-lg font-medium">{tier.name}</h3>
                    <span className="text-lg font-semibold text-white/90">
                      {priceDisplay}
                    </span>
                  </div>

                  <div
                    className="text-white/70 mb-4 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: tier.description }}
                  />

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

                  {/* Update the condition to allow commits for FUNDED pools that are below cap */}
                  {effectiveStatus !== "EXECUTING" &&
                    effectiveStatus !== "FAILED" &&
                    // Check if the pool is past its end date
                    new Date((pool as any).ends_at) > new Date() &&
                    // Allow commits for FUNDED pools as long as they're not full
                    !(
                      effectiveStatus === "FUNDED" &&
                      hasMaxPatrons &&
                      totalCommitments >= maxPatrons
                    ) && (
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

                  {effectiveStatus === "FAILED" && (
                    <div className="w-full py-3 bg-gray-700 text-gray-400 font-medium rounded-lg text-center">
                      Pool failed to reach target
                    </div>
                  )}

                  {/* Show message when pool is past end date */}
                  {new Date((pool as any).ends_at) <= new Date() &&
                    effectiveStatus !== "FAILED" && (
                      <div className="w-full py-3 bg-gray-700 text-gray-400 font-medium rounded-lg text-center">
                        Commitments no longer accepted
                      </div>
                    )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {patronList.map((user: any, i) => (
                          <div key={i} className="relative">
                            <UserAvatar
                              avatarUrl={user?.avatar_url}
                              name={
                                user?.name ||
                                user?.user_address?.substring(0, 6)
                              }
                              size={24}
                            />
                          </div>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-white/70">
                        {formatCommitmentCounter(
                          totalCommitments,
                          maxPatrons || 0,
                          totalCommitments === 1 ? "commit" : "commits"
                        )}
                      </span>
                    </div>
                    {hasMaxPatrons && totalCommitments >= maxPatrons && (
                      <span className="text-sm text-white/50">Tier full</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {hasCommitments &&
        !showAllTiers &&
        tiers.length > visibleTiers.length && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAllTiers(true)}
            className="mt-4 w-full py-3 bg-[#FFFFFF0A] hover:bg-[#FFFFFF14] text-white/70 font-medium rounded-lg transition-colors"
          >
            Show all tiers
          </motion.button>
        )}

      {hasCommitments && showAllTiers && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAllTiers(false)}
          className="mt-4 w-full py-3 bg-[#FFFFFF0A] hover:bg-[#FFFFFF14] text-white/70 font-medium rounded-lg transition-colors"
        >
          Show only my tiers
        </motion.button>
      )}

      {selectedTier && (
        <CommitConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          tier={selectedTier}
          pool={pool}
          usdcBalance={usdcBalance}
          onRefreshBalance={onRefreshBalance || (() => {})}
          onCommitSuccess={onCommitSuccess || (() => {})}
        />
      )}
    </div>
  );
};

export default TiersSection;
