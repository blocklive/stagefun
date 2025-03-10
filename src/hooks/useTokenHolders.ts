import { useState, useEffect } from "react";
import {
  getTokenHolders,
  enrichHolderData,
} from "../lib/services/token-holders-service";

export function useTokenHolders(tokenAddress: string | null) {
  const [holders, setHolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pageKey, setPageKey] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const fetchHolders = async (reset = false) => {
    if (!tokenAddress) return;

    try {
      setLoading(true);
      setError(null);

      // If reset, start from the beginning
      const currentPageKey = reset ? undefined : pageKey;

      const result = await getTokenHolders(tokenAddress, currentPageKey);

      // Enrich holder data with additional information
      const enriched = await enrichHolderData(result.holders);

      setHolders((prev) => (reset ? enriched : [...prev, ...enriched]));
      setPageKey(result.pageKey);
      setHasMore(!!result.pageKey);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch token holders")
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) {
      fetchHolders(true);
    }
  }, [tokenAddress]);

  // Function to load more holders
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchHolders();
    }
  };

  return {
    holders,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: () => fetchHolders(true),
  };
}
