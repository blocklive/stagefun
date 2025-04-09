import { Tier } from "../types";

/**
 * Calculates the maximum possible funding based on the tiers configuration
 * @param tiers Array of tier configurations
 * @returns Maximum possible funding in USDC
 */
export function calculateMaxPossibleFunding(tiers: Tier[]): {
  maxPossibleFunding: number;
  tierBreakdown: { name: string; contribution: number }[];
} {
  let maxPossibleFunding = 0;
  const tierBreakdown: { name: string; contribution: number }[] = [];

  // Handle empty tiers array
  if (!tiers || tiers.length === 0) {
    return {
      maxPossibleFunding: 0,
      tierBreakdown: [],
    };
  }

  // Process each tier to calculate its maximum contribution
  tiers.forEach((tier, index) => {
    // Skip inactive tiers
    if (!tier.isActive) return;

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

  console.log(`Total maximum possible funding: ${maxPossibleFunding} USDC`);

  return {
    maxPossibleFunding,
    tierBreakdown,
  };
}
