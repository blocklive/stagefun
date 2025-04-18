/**
 * Contract value utilities for pools and tiers
 */

// Maximum value for uint256 in Solidity (used for "uncapped" values)
export const UINT256_MAX =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/**
 * Check if a value represents an uncapped value (equal to uint256.max)
 */
export function isUncapped(value: string): boolean {
  return value === UINT256_MAX;
}

/**
 * Check if a tier is using uncapped pricing based on maxPrice value
 */
export function hasUncappedPricing(maxPrice: string): boolean {
  return isUncapped(maxPrice);
}

/**
 * Check if a tier has uncapped patrons based on maxPatrons value
 */
export function hasUncappedPatrons(maxPatrons: string): boolean {
  return isUncapped(maxPatrons);
}

/**
 * Format a contract value for display
 * If the value is uncapped (uint256.max), returns "Uncapped" or a custom label
 */
export function formatContractValue(
  value: string,
  uncappedLabel = "Uncapped"
): string {
  if (isUncapped(value)) {
    return uncappedLabel;
  }
  return value;
}

/**
 * Get a display price for a tier based on its pricing structure
 */
export function getTierPriceDisplay(tier: {
  isVariablePrice: boolean;
  price: string;
  minPrice: string;
  maxPrice: string;
}): string {
  if (!tier.isVariablePrice) {
    return `${tier.price} USDC`;
  }

  if (hasUncappedPricing(tier.maxPrice)) {
    return `${tier.minPrice}+ USDC`;
  }

  return `${tier.minPrice} - ${tier.maxPrice} USDC`;
}

/**
 * Get a display text for max patrons
 */
export function getMaxPatronsDisplay(maxPatrons: string): string {
  if (isUncapped(maxPatrons)) {
    return "Unlimited";
  }
  return maxPatrons;
}
