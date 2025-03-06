import useSWR from "swr";
import { getPoolById } from "../lib/services/pool-service";
import { getPatronsByPoolId } from "../lib/services/patron-service";
import { getUserById } from "../lib/services/user-service";

export function usePoolDetails(poolId: string | null) {
  const { data: poolData, error } = useSWR(
    poolId ? ["poolDetails", poolId] : null,
    async () => {
      if (!poolId) return null;

      try {
        // Get pool details
        const pool = await getPoolById(poolId);
        if (!pool) throw new Error("Pool not found");

        // Get creator details
        const creator = await getUserById(pool.creator_id);
        if (!creator) throw new Error("Creator not found");

        // Get patrons
        const patrons = await getPatronsByPoolId(poolId);

        return {
          creator,
          patrons,
        };
      } catch (error) {
        console.error("Error fetching pool details:", error);
        throw error;
      }
    }
  );

  return {
    creator: poolData?.creator || null,
    patrons: poolData?.patrons || [],
    isLoading: !error && !poolData,
    error,
  };
}
