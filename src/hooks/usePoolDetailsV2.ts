import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { supabase } from "../lib/supabase";
import { Pool } from "../lib/supabase";
import { DBTier } from "./usePoolTiers";
import { getDisplayStatus } from "../lib/contracts/types";

export interface PoolDetailsV2 {
  pool: Pool & {
    creator: {
      id: string;
      name: string;
      avatar_url: string;
    };
    tiers: (DBTier & {
      commitments: {
        user_address: string;
        amount: number;
        committed_at: string;
        user: {
          id: string;
          name: string;
          avatar_url: string;
        };
      }[];
      reward_items: {
        id: string;
        name: string;
        description: string;
        type: string;
        metadata: any;
        is_active: boolean;
      }[];
    })[];
  };
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

const fetcher = async (poolId: string) => {
  // First get the pool with its contract address
  const { data: poolData, error: poolError } = await supabase
    .from("pools")
    .select("*, contract_address")
    .eq("id", poolId)
    .single();

  if (poolError) throw poolError;

  // Then get all commitments for this pool's contract address
  const { data: commitments, error: commitmentsError } = await supabase
    .from("tier_commitments")
    .select("*")
    .ilike("pool_address", poolData.contract_address || "");

  if (commitmentsError) throw commitmentsError;

  // Get all users for these commitments
  const userAddresses =
    commitments?.map((c) => c.user_address.toLowerCase()) || [];

  let users: any[] = [];

  // If there are addresses to look up
  if (userAddresses.length > 0) {
    // Build a query that uses ILIKE for case-insensitive matching
    // for each address, check both smart_wallet_address and wallet_address

    // Build our OR conditions for each address
    const orConditions = [];

    for (const address of userAddresses) {
      // Add conditions for smart wallet - match exact address
      orConditions.push(`smart_wallet_address.ilike.${address}`);
      // Add conditions for regular wallet - match exact address
      orConditions.push(`wallet_address.ilike.${address}`);
    }

    // Join all conditions with OR
    const query = orConditions.join(",");

    // Execute the query
    const { data: foundUsers, error: usersError } = await supabase
      .from("users")
      .select("id, name, avatar_url, smart_wallet_address, wallet_address")
      .or(query);

    if (usersError) {
      console.error("Error fetching users:", usersError);
    } else {
      users = foundUsers || [];
    }
  }

  // Create a map of users by their wallet address (both smart and regular)
  const usersByAddress = {} as Record<string, any>;

  users?.forEach((user) => {
    // Add by smart wallet address (lowercase for case-insensitive comparison)
    if (user.smart_wallet_address) {
      usersByAddress[user.smart_wallet_address.toLowerCase()] = user;
    }

    // Also add by regular wallet address if available
    if (user.wallet_address) {
      usersByAddress[user.wallet_address.toLowerCase()] = user;
    }
  });

  // Combine commitments with user data
  const commitmentsWithUsers =
    commitments?.map((commitment) => {
      const userAddress = commitment.user_address.toLowerCase();
      const user = usersByAddress[userAddress];

      return {
        ...commitment,
        user: user || null,
      };
    }) || [];

  // Get the pool with all its related data
  const { data, error } = await supabase
    .from("pools")
    .select(
      `
      *,
      creator:users!creator_id (
        id,
        name,
        avatar_url
      ),
      tiers!pool_id (
        *,
        reward_items:tier_reward_items!tier_id (
          reward:reward_items!reward_item_id (
            id,
            name,
            description,
            type,
            metadata,
            is_active
          )
        )
      )
    `
    )
    .eq("id", poolId)
    .single();

  if (error) throw error;

  // Process the data to match our interface
  const processedData = {
    ...data,
    tiers:
      data.tiers?.map((tier: any, index: number) => {
        // Find commitments for this tier - handle both string and numeric tier_ids
        // Some commitments have numeric tier_id that corresponds to the tier index
        // For tier_id of 0 or null with only one tier, assign to the first tier
        const tierCommitments =
          commitmentsWithUsers?.filter((c) => {
            // Direct tier_id match
            if (c.tier_id === tier.id) return true;

            // Numeric index match (0-based)
            if (c.tier_id === index) return true;

            // String conversion match
            if (c.tier_id?.toString() === index.toString()) return true;

            // Special case for single tier pools - assign null and 0 tier_ids to first tier
            if (
              (c.tier_id === 0 || c.tier_id === null || c.tier_id === "0") &&
              index === 0 &&
              data.tiers.length === 1
            ) {
              return true;
            }

            return false;
          }) || [];

        return {
          ...tier,
          commitments: tierCommitments,
          reward_items: tier.reward_items?.map((ri: any) => ri.reward) || [],
        };
      }) || [],
  };

  // Calculate total raised amount from all tier commitments
  const totalRaised = commitmentsWithUsers.reduce((total, commitment) => {
    // Convert string amounts to numbers, ensuring we keep base units
    const amount = commitment.amount
      ? typeof commitment.amount === "string"
        ? parseInt(commitment.amount, 10)
        : Number(commitment.amount)
      : 0;

    return total + amount;
  }, 0);

  // Override the raised_amount with our calculated total from commitments
  const finalData = {
    ...processedData,
    raised_amount: totalRaised, // This is in base units (e.g. 10000 for 0.01 USDC)
  };

  return finalData;
};

export function usePoolDetailsV2(poolId: string): PoolDetailsV2 {
  const { data, error, mutate } = useSWR(
    poolId ? `pool-details-v2-${poolId}` : null,
    () => fetcher(poolId),
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    pool: data as Pool & {
      creator: { id: string; name: string; avatar_url: string };
      tiers: (DBTier & {
        commitments: {
          user_address: string;
          amount: number;
          committed_at: string;
          user: { id: string; name: string; avatar_url: string };
        }[];
        reward_items: {
          id: string;
          name: string;
          description: string;
          type: string;
          metadata: any;
          is_active: boolean;
        }[];
      })[];
    },
    isLoading: !error && !data,
    error,
    mutate,
  };
}
