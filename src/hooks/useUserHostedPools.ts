import { useMemo } from "react";
import { usePoolsWithDeposits } from "./usePoolsWithDeposits";

export function useUserHostedPools(userId: string | null | undefined) {
  // Use the pools hook with direct creator_id filtering in the database query
  const {
    pools: userHostedPools,
    isLoading,
    error,
    refresh,
    isUsingCache,
  } = usePoolsWithDeposits(1, undefined, userId);

  return {
    pools: userHostedPools,
    isLoading,
    error,
    refresh,
    totalCount: userHostedPools.length,
    isUsingCache,
  };
}
