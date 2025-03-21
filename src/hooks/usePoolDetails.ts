import useSWR from "swr";
import { getPoolById } from "../lib/services/pool-service";
import { getPatronsByPoolId } from "../lib/services/patron-service";
import { getUserById } from "../lib/services/user-service";
import { Pool } from "../lib/supabase";

export function usePoolDetails(poolId: string | null) {
  const {
    data: poolData,
    error,
    mutate,
  } = useSWR(
    poolId ? ["poolDetails", poolId] : null,
    async () => {
      if (!poolId) return null;

      try {
        // Get pool details (includes chain data)
        const pool = await getPoolById(poolId);
        if (!pool) throw new Error("Pool not found");

        // Get creator details
        const creator = await getUserById(pool.creator_id);
        if (!creator) throw new Error("Creator not found");

        // Get patrons
        const patrons = await getPatronsByPoolId(poolId);

        // Calculate percentage
        const percentage =
          pool.target_amount > 0
            ? (pool.raised_amount / pool.target_amount) * 100
            : 0;

        return {
          pool,
          creator,
          patrons,
          percentage,
        };
      } catch (error) {
        console.error("Error fetching pool details:", error);
        throw error;
      }
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds to get latest blockchain data
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    pool: poolData?.pool || null,
    creator: poolData?.creator || null,
    patrons: poolData?.patrons || [],
    targetAmount: poolData?.pool?.target_amount ?? 0,
    raisedAmount: poolData?.pool?.raised_amount ?? 0,
    percentage: poolData?.percentage ?? 0,
    isLoading: !error && !poolData,
    error,
    refresh: mutate,
  };
}
