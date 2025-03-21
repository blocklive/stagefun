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

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
