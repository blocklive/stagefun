import useSWR from "swr";
import { supabase } from "../lib/supabase";
import { ethers } from "ethers";
import { getAllTiers, Tier } from "../lib/contracts/StageDotFunPool";
import { useContractInteraction } from "./useContractInteraction";

export interface DBTier {
  id: string;
  name: string;
  description: string;
  price: number;
  is_variable_price: boolean;
  min_price: number | null;
  max_price: number | null;
  max_supply: number | null;
  current_supply: number;
  is_active: boolean;
  pool_id: string;
  reward_items?: RewardItem[];
  currentPatrons?: number;
  maxPatrons?: number;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
  metadata: any;
  creator_id: string;
  is_active: boolean;
}

async function fetchTiersAndRewards(poolId: string) {
  // First get the tiers
  const { data: tiers, error: tiersError } = await supabase
    .from("tiers")
    .select(
      `
      *,
      reward_items (
        id,
        name,
        description,
        type,
        metadata,
        creator_id,
        is_active
      )
    `
    )
    .eq("pool_id", poolId);

  if (tiersError) {
    throw tiersError;
  }

  return tiers as DBTier[];
}

export function usePoolTiers(poolId: string | undefined) {
  const {
    data: tiers,
    error,
    mutate,
  } = useSWR(poolId ? ["pool-tiers", poolId] : null, () =>
    poolId ? fetchTiersAndRewards(poolId) : null
  );

  return {
    tiers,
    isLoading: !error && !tiers,
    isError: error,
    mutate,
  };
}

// New hook to get tier information directly from the blockchain
export function usePoolTiersWithPatrons(poolAddress: string | null) {
  const { getProvider } = useContractInteraction();

  const {
    data: tiers,
    error,
    mutate,
  } = useSWR(
    poolAddress ? ["pool-tiers-chain", poolAddress] : null,
    async () => {
      if (!poolAddress) return null;
      try {
        const provider = await getProvider();
        return await getAllTiers(provider, poolAddress);
      } catch (error) {
        console.error("Error fetching tiers from chain:", error);
        throw error;
      }
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      shouldRetryOnError: true,
    }
  );

  return {
    tiers,
    isLoading: !error && !tiers,
    isError: error,
    mutate,
  };
}
