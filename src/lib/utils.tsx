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

/**
 * Format a numeric amount with specified precision
 */
export function formatAmount(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a currency amount with symbol
 */
export function formatCurrency(amount: number, symbol: string = "$"): string {
  return `${symbol}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/**
 * Format a blockchain contract balance with appropriate decimals
 */
export function formatContractBalance(
  balance: bigint | string | number,
  decimals: number = 6
): string {
  if (typeof balance === "string") {
    try {
      balance = BigInt(balance);
    } catch (e) {
      return "0";
    }
  }

  if (typeof balance === "number") {
    balance = BigInt(Math.floor(balance));
  }

  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  // Format the fractional part with leading zeros
  let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

  // Trim trailing zeros
  fractionalStr = fractionalStr.replace(/0+$/, "");

  if (fractionalStr === "") {
    return wholePart.toString();
  }

  return `${wholePart}.${fractionalStr}`;
}

/**
 * Format a creator name for display, handling nulls and empty strings
 */
export function getFormattedCreatorName(
  name: string | null | undefined | any
): string {
  if (!name) return "Anonymous";

  // Make sure name is a string before calling trim()
  if (typeof name !== "string") {
    // If name is an object with a name property (like a User object), try to use that
    if (
      typeof name === "object" &&
      name.name &&
      typeof name.name === "string"
    ) {
      return name.name.trim() || "Anonymous";
    }
    return "Anonymous";
  }

  const trimmedName = name.trim();
  if (trimmedName === "") return "Anonymous";

  return trimmedName;
}
