import useSWR from "swr";
import { getPoolById } from "../lib/services/pool-service";
import { getPatronsByPoolId } from "../lib/services/patron-service";
import { getUserById } from "../lib/services/user-service";
import { Pool } from "../lib/supabase";

// Helper for exponential backoff delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

        console.log("**** Pool details:", pool);
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
      } catch (err) {
        console.error("Error fetching pool details:", err);
        throw err;
      }
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      shouldRetryOnError: true,
      errorRetryCount: 5,
      onErrorRetry: async (err, key, config, revalidate, { retryCount }) => {
        // Check for specific blockchain errors that indicate a new pool
        const isBlockchainInitError =
          err.message?.includes("initializing") ||
          err.message?.includes("newly created") ||
          err.message?.includes("Contract not found") ||
          err.message?.includes("missing revert data");

        // For newly created pools, retry more aggressively with exponential backoff
        if (isBlockchainInitError) {
          // Calculate the maximum number of retries based on error type
          const maxRetries = 8;

          // Only retry if we haven't hit our limit
          if (retryCount < maxRetries) {
            const exponentialDelay = Math.min(
              1000 * Math.pow(2, retryCount),
              30000 // Cap at 30 seconds max delay
            );

            console.log(
              `Retrying pool fetch (attempt ${
                retryCount + 1
              }/${maxRetries}) after ${exponentialDelay}ms delay`
            );

            // Wait with exponential backoff
            await delay(exponentialDelay);

            // Perform the retry
            revalidate({ retryCount });
          }
        }
      },
    }
  );

  return {
    pool: poolData?.pool || null,
    creator: poolData?.creator || null,
    patrons: poolData?.patrons || [],
    targetAmount: poolData?.pool?.target_amount ?? 0,
    raisedAmount: poolData?.pool?.raised_amount ?? 0,
    percentage: poolData?.percentage ?? 0,
    targetReachedTime: poolData?.pool?.target_reached_time ?? 0,
    isLoading: !error && !poolData,
    error,
    refresh: mutate,
  };
}
