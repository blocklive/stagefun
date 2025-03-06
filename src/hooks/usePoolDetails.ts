import useSWR from "swr";
import { getPoolById } from "../lib/services/pool-service";
import { getPatronsByPoolId } from "../lib/services/patron-service";
import { getUserById } from "../lib/services/user-service";
import { Pool, User } from "../lib/supabase";
import { getLPTokenSymbol } from "../lib/services/contract-service";
import { ethers } from "ethers";

export function usePoolDetails(poolId: string) {
  const {
    data: poolData,
    error: poolError,
    mutate: refreshPool,
  } = useSWR(
    poolId ? ["pool-details", poolId] : null,
    async () => {
      const pool = await getPoolById(poolId);
      if (!pool) return null;

      const [creator, patrons] = await Promise.all([
        getUserById(pool.creator_id),
        getPatronsByPoolId(poolId),
      ]);

      let lpTokenSymbol = "";
      let lpTokenError = "";

      if (pool.contract_address) {
        try {
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
              ? "https://testnet-rpc.monad.xyz"
              : "https://sepolia.base.org"
          );
          lpTokenSymbol = await getLPTokenSymbol(
            provider,
            pool.contract_address
          );
        } catch (error) {
          console.error("Error fetching LP token symbol:", error);
          lpTokenError = "Unable to fetch token symbol";
        }
      }

      return {
        pool,
        creator,
        patrons,
        lpTokenSymbol,
        lpTokenError,
      };
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  );

  return {
    pool: poolData?.pool || null,
    creator: poolData?.creator || null,
    patrons: poolData?.patrons || [],
    lpTokenSymbol: poolData?.lpTokenSymbol || "",
    lpTokenError: poolData?.lpTokenError || "",
    isLoading: !poolError && !poolData,
    error: poolError,
    refresh: refreshPool,
  };
}
