import { useMemo } from "react";
import { usePoolsWithDeposits } from "./usePoolsWithDeposits";

export function useUserHostedPools(userId: string | null | undefined) {
  // Use the exact same hook that works in the Pools List
  const {
    pools: allPools,
    isLoading,
    error,
    isRpcError,
    refresh,
    isUsingCache,
  } = usePoolsWithDeposits();

  // Filter pools by creator_id (userId) - this happens client-side with no blockchain calls
  const userHostedPools = useMemo(() => {
    if (!userId || !allPools) return [];

    // Filter pools by creator_id
    return (
      allPools
        .filter((pool) => pool.creator_id === userId)
        // Sort by most recent
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    );
  }, [allPools, userId]);

  return {
    pools: userHostedPools,
    isLoading,
    error,
    isRpcError,
    refresh,
    totalCount: userHostedPools.length,
    isUsingCache,
  };
}
