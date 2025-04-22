import useSWR, { KeyedMutator } from "swr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tier as CreateTier } from "@/app/pools/create/types";
import { RewardItem } from "@/app/pools/create/types";
import { fromUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";

interface UseEditPoolTiersOptions {
  poolId: string | undefined;
  supabase: SupabaseClient | null;
}

interface UseEditPoolTiersResult {
  tiers: CreateTier[];
  availableRewardItems: RewardItem[];
  isLoading: boolean;
  error: Error | null;
  mutate: KeyedMutator<{
    tiers: CreateTier[];
    availableRewardItems: RewardItem[];
  }>;
}

export function useEditPoolTiers({
  poolId,
  supabase,
}: UseEditPoolTiersOptions): UseEditPoolTiersResult {
  const shouldFetch = !!poolId && !!supabase;

  const fetcher = async () => {
    if (!poolId || !supabase) {
      return { tiers: [], availableRewardItems: [] };
    }

    // Fetch tiers with their associated rewards in one query
    const { data: tierData, error } = await supabase
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
      .eq("pool_id", poolId)
      .order("id");

    if (error) {
      throw new Error(`Failed to load tiers: ${error.message}`);
    }

    // Convert DB tiers to the format expected by TiersSection
    const createTiers: CreateTier[] = tierData.map((dbTier) => ({
      id: dbTier.id,
      name: dbTier.name,
      // Convert prices from base units to human-readable values
      price: fromUSDCBaseUnits(BigInt(dbTier.price)).toString(),
      isActive: dbTier.is_active,
      nftMetadata: dbTier.nft_metadata || "",
      isVariablePrice: dbTier.is_variable_price,
      minPrice: dbTier.min_price
        ? fromUSDCBaseUnits(BigInt(dbTier.min_price)).toString()
        : "0",
      maxPrice: dbTier.max_price
        ? fromUSDCBaseUnits(BigInt(dbTier.max_price)).toString()
        : "0",
      maxPatrons: dbTier.max_supply ? dbTier.max_supply.toString() : "0",
      description: dbTier.description || "",
      // Extract reward item IDs from the joined rewards
      rewardItems: dbTier.reward_items
        ? dbTier.reward_items.map((reward: any) => reward.id)
        : [],
      imageUrl: dbTier.image_url,
      modifiedFields: new Set<string>(),
      // Add default values for required properties
      pricingMode: dbTier.is_variable_price
        ? dbTier.max_price
          ? "range"
          : "uncapped"
        : "fixed",
      patronsMode: dbTier.max_supply ? "limited" : "uncapped",
      // Add the onchain_index from the database
      onchain_index: dbTier.onchain_index,
    }));

    // Collect all reward items from the tiers
    const allPoolRewards: RewardItem[] = [];
    tierData.forEach((dbTier) => {
      if (dbTier.reward_items && dbTier.reward_items.length > 0) {
        dbTier.reward_items.forEach((reward: any) => {
          // Check if this reward is already in our list to avoid duplicates
          if (!allPoolRewards.some((r) => r.id === reward.id)) {
            allPoolRewards.push({
              id: reward.id,
              name: reward.name,
              description: reward.description || "",
              type: reward.type || "default",
            });
          }
        });
      }
    });

    return {
      tiers: createTiers,
      availableRewardItems: allPoolRewards,
    };
  };

  const { data, error, mutate, isLoading } = useSWR(
    shouldFetch ? `pool-tiers-${poolId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );

  return {
    tiers: data?.tiers || [],
    availableRewardItems: data?.availableRewardItems || [],
    isLoading,
    error: error as Error | null,
    mutate,
  };
}
