/**
 * Utility functions for the application
 */

/**
 * Format a number as currency (USD)
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  // Remove debug log

  // Handle very large numbers
  if (amount > 1000000) {
    const millions = amount / 1000000;
    return `$${millions.toFixed(1)}M`;
  }

  // Check if the number has more than 2 decimal places of precision
  const decimalPlaces = amount.toString().split(".")[1]?.length || 0;
  const shouldShowMorePrecision = decimalPlaces > 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: shouldShowMorePrecision ? 8 : 2,
    maximumFractionDigits: shouldShowMorePrecision ? 8 : 2,
  }).format(amount);
}

/**
 * Format a contract balance with appropriate precision
 * Shows more decimals only if they exist in the raw balance
 * @param rawBalance The raw balance string from ethers.formatUnits
 * @returns Formatted currency string
 */
export function formatContractBalance(rawBalance: string): string {
  // Check if we have more than 2 decimal places
  const decimalPlaces = rawBalance.split(".")[1]?.length || 0;
  const shouldShowMorePrecision = decimalPlaces > 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: shouldShowMorePrecision ? decimalPlaces : 2,
    maximumFractionDigits: shouldShowMorePrecision ? decimalPlaces : 2,
  }).format(Number(rawBalance));
}

/**
 * Format creator name with optional Twitter username
 * @param creator The creator object containing name and twitter_username
 * @returns Formatted creator name string
 */
export function getFormattedCreatorName(
  creator: { name?: string | null; twitter_username?: string | null } | null
): string {
  if (!creator) return "Anonymous";
  return creator.name || "Anonymous";
}
