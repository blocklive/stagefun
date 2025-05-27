import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  created_at: string;
  metadata?: {
    [key: string]: any;
  };
  pool?: {
    name: string;
    slug: string;
  } | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  hasMore: boolean;
  total: number;
}

export const useTransactions = () => {
  const { getAccessToken } = usePrivy();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchTransactions = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      try {
        if (pageNum === 0) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("No access token available");
        }

        const response = await fetch(
          `/api/transactions?page=${pageNum}&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data: TransactionsResponse = await response.json();

        if (append) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }

        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [getAccessToken]
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchTransactions(page + 1, true);
    }
  }, [fetchTransactions, page, isLoadingMore, hasMore]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
};
