/**
 * Contract value utilities for pools and tiers
 */

// Safe maximum value for representing "uncapped" values
// 2^53 - 1, JavaScript's MAX_SAFE_INTEGER
export const MAX_SAFE_VALUE = "9007199254740991";
// Same value converted to USDC base units (multiplied by 10^6)
export const MAX_SAFE_VALUE_BASE_UNITS = "9007199254740991000000";
// Common SQL max integer (2^31-1) for backward compatibility
export const SQL_MAX_INT = "2147483647";

/**
 * Check if a value represents an uncapped value
 */
export function isUncapped(value: string): boolean {
  // Handle scientific notation (e.g., "9.007199254740991e+21")
  try {
    // Convert input to number first to handle scientific notation
    const numericValue = Number(value);

    // If it's a valid number, check against our max values as numbers
    if (!isNaN(numericValue)) {
      const rawMaxAsNum = Number(MAX_SAFE_VALUE);
      const baseUnitsMaxAsNum = Number(MAX_SAFE_VALUE_BASE_UNITS);
      const sqlMaxAsNum = Number(SQL_MAX_INT);

      // Check if it's effectively equal to any of our max values
      // (using a small epsilon for floating point comparison)
      const epsilon = 0.00001; // Small tolerance for floating point comparison
      const isEqualToRaw =
        Math.abs(numericValue - rawMaxAsNum) < epsilon * rawMaxAsNum;
      const isEqualToBaseUnits =
        Math.abs(numericValue - baseUnitsMaxAsNum) <
        epsilon * baseUnitsMaxAsNum;
      const isEqualToSqlMax =
        Math.abs(numericValue - sqlMaxAsNum) < epsilon * sqlMaxAsNum;

      if (isEqualToRaw || isEqualToBaseUnits || isEqualToSqlMax) {
        return true;
      }
    }
  } catch (e) {
    // Silently handle errors and fall back to string comparison
  }

  // Fall back to the original string checks
  return (
    value === MAX_SAFE_VALUE ||
    value === MAX_SAFE_VALUE_BASE_UNITS ||
    value === SQL_MAX_INT ||
    value === "9007199254740991" ||
    value === "9007199254740991000000" ||
    value === "2147483647"
  );
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

/**
 * Convert a value to USDC base units (multiplied by 10^6), handling special case for MAX_SAFE_VALUE which is used to
 * represent the maximum uint256 value (uncapped).
 *
 * @param value The string value to convert
 * @param isStringValue If true, value is already a string and should be checked directly
 * @returns BigInt representing either the converted value or the original MAX_SAFE_VALUE
 */
export function safeToUSDCBaseUnits(
  value: string | number,
  isStringValue = false
): bigint {
  // If the value is already a string, check if it equals MAX_SAFE_VALUE
  if (isStringValue && value === MAX_SAFE_VALUE) {
    // Multiply by USDC_DECIMAL_FACTOR for consistency with other price values
    return BigInt(MAX_SAFE_VALUE) * BigInt(1000000);
  }

  // If the value is a number that matches MAX_SAFE_VALUE when converted to string
  if (!isStringValue && String(value) === MAX_SAFE_VALUE) {
    // Multiply by USDC_DECIMAL_FACTOR for consistency with other price values
    return BigInt(MAX_SAFE_VALUE) * BigInt(1000000);
  }

  // Regular conversion for normal values
  return BigInt(Math.floor(Number(value) * 1000000));
}
