import { Tier } from "../types";
import { MAX_SAFE_VALUE, isUncapped } from "@/lib/utils/contractValues";

/**
 * Special value representing unlimited/infinite funding potential
 */
export const UNLIMITED_FUNDING = -1;

/**
 * Calculate the maximum possible funding based on all tiers
 *
 * Tier funds are calculated as:
 * - Fixed price tiers: price * max_patrons
 * - Variable price tiers: max_price * max_patrons
 *
 * If any tier has unlimited pricing or unlimited patrons,
 * the pool has unlimited funding potential.
 */
export function calculateMaxPossibleFunding(tiers: Tier[]): {
  maxPossibleFunding: number;
  tierBreakdown: { name: string; contribution: number }[];
  isUnlimited: boolean;
} {
  let maxPossibleFunding = 0;
  let hasUnlimitedPotential = false;
  const tierBreakdown: { name: string; contribution: number }[] = [];

  // Skip inactive tiers
  const activeTiers = tiers.filter((tier) => tier.isActive);

  if (activeTiers.length === 0) {
    return {
      maxPossibleFunding: 0,
      tierBreakdown: [],
      isUnlimited: false,
    };
  }

  activeTiers.forEach((tier, index) => {
    // Skip inactive tiers
    if (!tier.isActive) return;

    // Check for uncapped patrons
    if (isUncapped(tier.maxPatrons)) {
      hasUnlimitedPotential = true;

      // Add to breakdown with Infinity contribution
      tierBreakdown.push({
        name: tier.name || `Tier ${index + 1}`,
        contribution: Infinity,
      });

      return; // Skip further processing for this tier
    }

    // Check for uncapped pricing with limited patrons
    if (
      (tier.isVariablePrice && isUncapped(tier.maxPrice)) ||
      (!tier.isVariablePrice && isUncapped(tier.price))
    ) {
      hasUnlimitedPotential = true;

      // Add to breakdown with Infinity contribution
      tierBreakdown.push({
        name: tier.name || `Tier ${index + 1}`,
        contribution: Infinity,
      });

      return; // Skip further processing for this tier
    }

    // Handle normal tiers with limited patrons
    // Safely parse values with fallbacks
    const maxPatrons = parseInt(tier.maxPatrons) || 0;
    if (maxPatrons <= 0) return;

    let tierAmount = 0;
    let priceUsed = 0;

    if (tier.isVariablePrice) {
      // For variable price tiers, use the maximum price
      const maxPrice = parseFloat(tier.maxPrice) || 0;
      priceUsed = maxPrice;
      tierAmount = maxPatrons * maxPrice;
    } else {
      // For fixed price tiers, use the regular price
      const price = parseFloat(tier.price) || 0;
      priceUsed = price;
      tierAmount = maxPatrons * price;
    }

    // Add this tier's contribution to the total
    maxPossibleFunding += tierAmount;

    // Add to breakdown for detailed display
    const tierContribution = {
      name: tier.name || `Tier ${index + 1}`,
      contribution: tierAmount,
    };

    // Add debug info
    console.log(
      `Tier "${tierContribution.name}": ${maxPatrons} patrons × ${priceUsed} USDC = ${tierContribution.contribution} USDC`
    );

    tierBreakdown.push(tierContribution);
  });

  // Log the total
  if (hasUnlimitedPotential) {
    console.log(`Total maximum possible funding: Unlimited`);
  } else {
    console.log(`Total maximum possible funding: ${maxPossibleFunding} USDC`);
  }

  return {
    maxPossibleFunding: hasUnlimitedPotential
      ? UNLIMITED_FUNDING
      : maxPossibleFunding,
    tierBreakdown,
    isUnlimited: hasUnlimitedPotential,
  };
}
