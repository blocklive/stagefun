import { Tier } from "../types";
import { MAX_SAFE_VALUE, isUncapped } from "@/lib/utils/contractValues";

/**
 * Special value representing unlimited/infinite funding potential
 */
export const UNLIMITED_FUNDING = -1;

/**
 * Calculates the maximum possible funding based on the tiers configuration
 * @param tiers Array of tier configurations
 * @returns Maximum possible funding in USDC or UNLIMITED_FUNDING for uncapped
 */
export function calculateMaxPossibleFunding(tiers: Tier[]): {
  maxPossibleFunding: number;
  tierBreakdown: { name: string; contribution: number }[];
  isUnlimited: boolean;
} {
  let maxPossibleFunding = 0;
  let hasUnlimitedPotential = false;
  const tierBreakdown: { name: string; contribution: number }[] = [];

  // Handle empty tiers array
  if (!tiers || tiers.length === 0) {
    return {
      maxPossibleFunding: 0,
      tierBreakdown: [],
      isUnlimited: false,
    };
  }

  // Process each tier to calculate its maximum contribution
  tiers.forEach((tier, index) => {
    // Skip inactive tiers
    if (!tier.isActive) return;

    // Check if this tier has uncapped patrons
    const hasUncappedPatrons = isUncapped(tier.maxPatrons);

    // Check if this tier has uncapped price
    const hasUncappedPrice = tier.isVariablePrice && isUncapped(tier.maxPrice);

    // If both patrons and price are uncapped, this tier has unlimited potential
    if (hasUncappedPatrons && hasUncappedPrice) {
      hasUnlimitedPotential = true;

      // Add this tier to the breakdown with Infinity contribution
      tierBreakdown.push({
        name: tier.name || `Tier ${index + 1}`,
        contribution: Infinity,
      });

      return; // Skip further processing for this tier
    }

    // For tiers with only uncapped patrons but fixed or range pricing
    if (hasUncappedPatrons) {
      hasUnlimitedPotential = true;

      // Use the fixed price or max price to show potential contribution
      const priceValue = tier.isVariablePrice
        ? parseFloat(tier.maxPrice) || 0
        : parseFloat(tier.price) || 0;

      // Add to breakdown with Infinity contribution
      tierBreakdown.push({
        name: tier.name || `Tier ${index + 1}`,
        contribution: Infinity,
      });

      return; // Skip further processing for this tier
    }

    // Check for uncapped pricing with limited patrons
    if (
      (tier.isVariablePrice && tier.maxPrice === MAX_SAFE_VALUE) ||
      (!tier.isVariablePrice && tier.price === MAX_SAFE_VALUE)
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
