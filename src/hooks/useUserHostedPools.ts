import { useMemo } from "react";
import { usePoolsWithDeposits } from "./usePoolsWithDeposits";

export function useUserHostedPools(userId: string | null | undefined) {
  // Use the pools hook with direct creator_id filtering in the database query
  // Important: We must set poolType to "my" to ensure filtering by creator_id
  const {
    pools: userHostedPools,
    isLoading,
    error,
    refresh,
    isUsingCache,
  } = usePoolsWithDeposits(1, undefined, userId, "my");

  return {
    pools: userHostedPools,
    isLoading,
    error,
    refresh,
    totalCount: userHostedPools.length,
    isUsingCache,
  };
}
