import { useState, useEffect, useCallback } from "react";
import { useSmartWallet } from "./useSmartWallet";

// Define types for transaction data
export interface TransactionItem {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string;
  category: string;
  rawContract: {
    value: string;
    decimal: string;
    address: string | null;
  };
  tokenId: string | null;
  erc721TokenId: string | null;
  erc1155Metadata: any | null;
  metadata: {
    blockTimestamp: string;
    [key: string]: any;
  };
}

// Define types for the hook results
export interface TransactionHistoryResult {
  transactions: TransactionItem[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
  refresh: () => void;
}

/**
 * Custom hook to fetch and manage transaction history for a wallet
 * @param address Optional override address (uses smart wallet address by default)
 * @param chainId Chain ID (default: "monad-test-v2")
 * @returns Transaction history data and management functions
 */
export function useTransactionHistory(
  address?: string,
  chainId: string = "monad-test-v2"
): TransactionHistoryResult {
  const { smartWalletAddress } = useSmartWallet();
  const walletAddress = address || smartWalletAddress;

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Store pagination key
  const [pageKey, setPageKey] = useState<string | null>(null);

  // Fetch transaction history using the simplified approach from the docs
  const fetchTransactions = useCallback(
    async (append: boolean = false, customPageKey: string | null = null) => {
      if (!walletAddress) return;

      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        // Construct the URL with base parameters
        const url = `/api/alchemy/transfers?address=${walletAddress}&chainId=${chainId}`;

        // Add pageKey if available
        const finalUrl = customPageKey
          ? `${url}&pageKey=${customPageKey}`
          : url;

        console.log(`Fetching transactions from: ${finalUrl}`);

        const response = await fetch(finalUrl);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch transactions: ${errorText}`);
        }

        const data = await response.json();

        // Update transaction list
        if (append) {
          setTransactions((prev) => [...prev, ...data.transfers]);
        } else {
          setTransactions(data.transfers);
        }

        // Store pagination key
        setPageKey(data.metadata.pageKey);
        setHasMore(Boolean(data.metadata.pageKey));
      } catch (err) {
        console.error("Error fetching transaction history:", err);
        setIsError(true);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch transaction history"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [walletAddress, chainId]
  );

  // Initial fetch on mount and when dependencies change
  useEffect(() => {
    if (walletAddress) {
      // Reset pagination when address or chain changes
      setPageKey(null);
      fetchTransactions(false, null);
    }
  }, [walletAddress, chainId, fetchTransactions]);

  // Load more transactions
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchTransactions(true, pageKey);
  }, [isLoading, hasMore, fetchTransactions, pageKey]);

  // Refresh the transaction list
  const refresh = useCallback(() => {
    setPageKey(null);
    fetchTransactions(false, null);
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    isError,
    error,
    loadMore,
    hasMore,
    refresh,
  };
}
