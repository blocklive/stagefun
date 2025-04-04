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
    .ilike("pool_address", poolData.contract_address);

  if (commitmentsError) throw commitmentsError;

  // Get all users for these commitments
  const userAddresses = commitments?.map((c) => c.user_address) || [];
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, avatar_url, smart_wallet_address")
    .in("smart_wallet_address", userAddresses);

  if (usersError) throw usersError;

  // Create a map of users by their wallet address
  const usersByAddress =
    users?.reduce((acc, user) => {
      acc[user.smart_wallet_address] = user;
      return acc;
    }, {} as Record<string, any>) || {};

  // Combine commitments with user data
  const commitmentsWithUsers =
    commitments?.map((commitment) => ({
      ...commitment,
      user: usersByAddress[commitment.user_address] || null,
    })) || [];

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
      data.tiers?.map((tier: any) => ({
        ...tier,
        commitments:
          commitmentsWithUsers?.filter((c) => c.tier_id === tier.id) || [],
        reward_items: tier.reward_items?.map((ri: any) => ri.reward) || [],
      })) || [],
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

  console.log("Final data:", finalData);
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
