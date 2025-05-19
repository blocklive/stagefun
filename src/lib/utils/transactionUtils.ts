import { ethers } from "ethers";
import { TransactionItem } from "@/hooks/useTransactionHistory";

/**
 * Format the transaction value for display
 */
export function formatTransactionValue(transaction: TransactionItem): string {
  if (!transaction.value && transaction.value !== 0) return "";

  return transaction.value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

/**
 * Generate a shortened address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (!ethers.isAddress(address)) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(
    42 - chars
  )}`;
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(transactions: TransactionItem[]): {
  [date: string]: TransactionItem[];
} {
  const groupedTransactions: { [date: string]: TransactionItem[] } = {};

  transactions.forEach((transaction) => {
    if (!transaction.metadata?.blockTimestamp) return;

    // Format the date as "Month DD, YYYY"
    const timestamp = new Date(transaction.metadata.blockTimestamp);
    const dateKey = timestamp.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }

    groupedTransactions[dateKey].push(transaction);
  });

  return groupedTransactions;
}

/**
 * Get the transaction type (sent, received, or unknown)
 */
export function getTransactionType(
  transaction: TransactionItem,
  address: string
): "sent" | "received" | "unknown" {
  if (!address) return "unknown";

  const normalizedAddress = address.toLowerCase();
  const from = transaction.from.toLowerCase();
  const to = transaction.to.toLowerCase();

  if (from === normalizedAddress) {
    return "sent";
  } else if (to === normalizedAddress) {
    return "received";
  } else {
    return "unknown";
  }
}

/**
 * Determine if a transaction is incoming for a specified address
 */
export function isIncomingTransaction(
  transaction: TransactionItem,
  address: string
): boolean {
  if (!address) return false;
  return transaction.to.toLowerCase() === address.toLowerCase();
}

/**
 * Get transaction amount with sign (+ for received, - for sent)
 */
export function getTransactionAmountWithSign(
  transaction: TransactionItem,
  address: string
): string {
  if (!transaction.value && transaction.value !== 0) return "";

  const type = getTransactionType(transaction, address);
  const value = formatTransactionValue(transaction);
  const asset = transaction.asset || "";

  if (type === "received") {
    return `+${value} ${asset}`;
  } else if (type === "sent") {
    return `-${value} ${asset}`;
  } else {
    return `${value} ${asset}`;
  }
}

/**
 * Get the display color class for a transaction amount
 */
export function getTransactionAmountColorClass(
  transaction: TransactionItem,
  address: string
): string {
  const type = getTransactionType(transaction, address);

  if (type === "received") {
    return "text-green-500"; // Green for received
  } else if (type === "sent") {
    return "text-red-500"; // Red for sent
  } else {
    return "text-gray-400"; // Default color
  }
}

/**
 * Get human-readable transaction description
 */
export function getTransactionDescription(
  transaction: TransactionItem,
  address: string
): string {
  const type = getTransactionType(transaction, address);

  if (type === "received") {
    return `Received from ${shortenAddress(transaction.from)}`;
  } else if (type === "sent") {
    return `Sent to ${shortenAddress(transaction.to)}`;
  } else {
    return "Unknown transaction";
  }
}
