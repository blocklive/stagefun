/**
 * Contract value utilities for pools and tiers
 */

// Safe maximum value for representing "uncapped" values
// Using PostgreSQL's max integer value (2^31 - 1) which is safe for both database and contract
export const MAX_SAFE_VALUE = "2147483647";

/**
 * Check if a value represents an uncapped value
 */
export function isUncapped(value: string): boolean {
  return value === MAX_SAFE_VALUE;
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
 * If the value is uncapped (MAX_SAFE_VALUE), returns "Uncapped" or a custom label
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
 * Format a range display for variable pricing or patron limits
 * Properly handles cases where max value is uncapped/unlimited
 */
export function formatRangeDisplay(
  minValue: string,
  maxValue: string,
  unit = "USDC",
  uncappedLabel = "Unlimited"
): string {
  if (isUncapped(maxValue)) {
    return `${minValue}+ ${unit}`;
  }
  return `${minValue}-${maxValue} ${unit}`;
}

/**
 * Format a commitment counter for display (e.g. "0/100 commits" or "0 commits")
 * For uncapped values, we simply don't show the limit for a cleaner UI
 */
export function formatCommitmentCounter(
  currentValue: string | number,
  maxValue: string | number,
  suffix = "commits"
): string {
  const current =
    typeof currentValue === "string" ? currentValue : currentValue.toString();

  const max = typeof maxValue === "string" ? maxValue : maxValue.toString();

  if (isUncapped(max)) {
    return `${current} ${suffix}`;
  }
  return `${current}/${max} ${suffix}`;
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
