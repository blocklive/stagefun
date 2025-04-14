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

/**
 * Format an amount with appropriate formatting based on size
 * Only shows decimal places when needed
 * @param amount The number to format
 * @returns Formatted string without currency symbol
 */
export function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    // For millions, show one decimal if needed
    const millions = amount / 1000000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  } else if (amount >= 1000) {
    // For thousands, show one decimal if needed
    const thousands = amount / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  } else if (amount >= 0.01) {
    // For regular numbers, only show decimals if not a whole number
    return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  } else if (amount > 0) {
    // For very small numbers, calculate significant digits properly
    const amountStr = amount.toString();
    const decimalPart = amountStr.split(".")[1] || "";

    // Count leading zeros in decimal part
    let leadingZeros = 0;
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] === "0") {
        leadingZeros++;
      } else {
        break;
      }
    }

    // Show at least 2 significant digits after leading zeros
    // but cap at 6 decimal places total
    const decimalsToShow = Math.min(leadingZeros + 2, 6);
    return amount.toFixed(decimalsToShow);
  }
  return "0";
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
