/**
 * Utility functions for the application
 */

/**
 * Format a number as currency (USD)
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  // Log the amount for debugging
  console.log("formatCurrency called with:", amount);

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
