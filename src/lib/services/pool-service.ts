import { supabase } from "../supabase";
import {
  getDeployedPools,
  getPoolDetails,
  fromUSDCBaseUnits,
  ContractPool,
} from "../contracts/StageDotFunPool";
import { createPoolOnChain } from "./contract-service";
import { ethers } from "ethers";
import { getPoolStatusString } from "@/lib/contracts/types";

export interface Pool {
  id: string;
  created_at?: string;
  name: string;
  status: string;
  description: string;
  funding_stage: string;
  ends_at: string;
  target_amount: number;
  raised_amount: number;
  currency: string;
  token_amount: number;
  token_symbol: string;
  location?: string;
  venue?: string;
  image_url?: string | null;
  creator_id: string;
  creator_name?: string;
  creator_avatar_url?: string;
  min_commitment?: number;
  ticker?: string;
  // Blockchain fields
  blockchain_tx_hash?: string;
  blockchain_block_number?: number;
  blockchain_status: number;
  blockchain_network?: string;
  blockchain_explorer_url?: string;
  contract_address?: string; // Address of the deployed pool contract
  lp_token_address?: string;
  // Additional fields
  slug?: string;
  revenue_accumulated?: number;
  patron_count?: number;
  patrons_number?: number;
  lp_holders?: any[];
  milestones?: any[];
  emergency_mode?: boolean;
  emergency_withdrawal_request_time?: number;
  authorized_withdrawer?: string;
  target_reached_time?: number;
  display_public?: boolean;
  featured?: number;
  // Social links
  social_links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    instagram?: string;
    [key: string]: string | undefined;
  } | null;
}

export async function getAllPools(): Promise<Pool[]> {
  // Get pools from database
  const { data: dbPools, error: dbError } = await supabase
    .from("pools")
    .select(
      `
      *,
      creator:creator_id (
        name,
        avatar_url
      )
    `
    )
    .order("created_at", { ascending: false });

  if (dbError) throw dbError;

  // Get pools from blockchain
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

  // Create a map of contract addresses to chain data
  const chainDataMap = new Map();

  // Fetch pool details for each pool with a contract address
  await Promise.all(
    dbPools
      .filter((pool) => pool.contract_address)
      .map(async (pool) => {
        try {
          const chainData = await getPoolDetails(
            provider,
            pool.contract_address
          );
          chainDataMap.set(pool.contract_address.toLowerCase(), {
            totalDeposits: fromUSDCBaseUnits(chainData.totalDeposits), // Convert using utility function
            revenueAccumulated: fromUSDCBaseUnits(chainData.revenueAccumulated), // Convert using utility function
            status: chainData.status, // Keep the raw status number
            endTime: Number(chainData.endTime),
            lpTokenAddress: chainData.lpTokenAddress,
          });
        } catch (error) {
          console.error(
            `Error fetching chain data for pool ${pool.id}:`,
            error
          );
        }
      })
  );

  // Combine database and chain data
  return dbPools.map((dbPool) => {
    const chainData = chainDataMap.get(dbPool.contract_address?.toLowerCase());
    return {
      ...dbPool,
      creator_name: dbPool.creator?.name || "Anonymous",
      creator_avatar_url: dbPool.creator?.avatar_url || null,
      raised_amount: chainData?.totalDeposits || 0,
      revenue_accumulated: chainData?.revenueAccumulated || 0,
      status: getPoolStatusString(chainData?.status || 0), // Use the proper status string conversion
      end_time: chainData?.endTime || 0,
      lp_token_address: chainData?.lpTokenAddress || null,
    };
  });
}

export async function getAllPoolsWithoutBlockchain(): Promise<Pool[]> {
  // Get pools from database only, without blockchain data
  const { data: dbPools, error: dbError } = await supabase
    .from("pools")
    .select(
      `
      *,
      creator:creator_id (
        name,
        avatar_url
      )
    `
    )
    .order("created_at", { ascending: false });

  if (dbError) throw dbError;

  // Return pools with basic formatting but no blockchain data
  return dbPools.map((dbPool) => {
    return {
      ...dbPool,
      creator_name: dbPool.creator?.name || "Anonymous",
      creator_avatar_url: dbPool.creator?.avatar_url || null,
      // Use database values for these fields instead of blockchain data
      raised_amount: dbPool.raised_amount || 0,
      status: dbPool.status || "inactive",
    };
  });
}

export async function getPoolById(id: string): Promise<Pool | null> {
  // Get pool from database
  const { data: dbPool, error: dbError } = await supabase
    .from("pools")
    .select(
      `
      *,
      creator:creator_id (
        name,
        avatar_url
      )
    `
    )
    .eq("id", id)
    .single();

  if (dbError) throw dbError;
  if (!dbPool) return null;

  let chainData: ContractPool = {
    name: "",
    uniqueId: "",
    creator: ethers.ZeroAddress,
    totalDeposits: BigInt(0),
    revenueAccumulated: BigInt(0),
    endTime: BigInt(0),
    targetAmount: BigInt(0),
    capAmount: BigInt(0),
    status: 0,
    lpTokenAddress: ethers.ZeroAddress,
    nftContractAddress: "",
    tierCount: BigInt(0),
    targetReachedTime: BigInt(0),
    capReachedTime: BigInt(0),
    minCommitment: BigInt(0),
    lpHolders: [],
    milestones: [],
    emergencyMode: false,
    emergencyWithdrawalRequestTime: BigInt(0),
    authorizedWithdrawer: ethers.ZeroAddress,
  };

  // Only try to get blockchain data if we have a contract address
  if (dbPool.contract_address) {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      chainData = await getPoolDetails(provider, dbPool.contract_address);
    } catch (error) {
      // Only log actual errors
      console.error("[Pool Details] Chain data error:", {
        address: dbPool.contract_address,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Convert BigInt values to numbers and handle division by 1_000_000 for USDC amounts
  const totalDeposits = fromUSDCBaseUnits(chainData.totalDeposits);
  const revenueAccumulated = fromUSDCBaseUnits(chainData.revenueAccumulated);
  const targetAmount = fromUSDCBaseUnits(chainData.targetAmount);
  const capAmount = fromUSDCBaseUnits(chainData.capAmount);
  const minCommitment = fromUSDCBaseUnits(chainData.minCommitment);

  return {
    ...dbPool,
    creator_name: dbPool.creator?.name || "Anonymous",
    creator_avatar_url: dbPool.creator?.avatar_url || null,
    target_amount:
      targetAmount || Number(dbPool.target_amount) / 1_000_000 || 0,
    min_commitment:
      minCommitment || Number(dbPool.min_commitment) / 1_000_000 || 0,
    cap_amount:
      capAmount ||
      (dbPool.cap_amount ? Number(dbPool.cap_amount) / 1_000_000 : 0),
    raised_amount: totalDeposits || dbPool.raised_amount || 0,
    revenue_accumulated:
      revenueAccumulated || Number(dbPool.revenue_accumulated) / 1_000_000 || 0,
    blockchain_status: Number(chainData.status || 0),
    status: getPoolStatusString(chainData.status),
    end_time: Number(chainData.endTime) || 0,
    lp_token_address: chainData.lpTokenAddress || null,
    lp_holders: chainData.lpHolders || [],
    milestones: chainData.milestones || [],
    emergency_mode: chainData.emergencyMode || false,
    emergency_withdrawal_request_time:
      Number(chainData.emergencyWithdrawalRequestTime) || 0,
    authorized_withdrawer: chainData.authorizedWithdrawer || "",
    patrons_number: dbPool.patrons_number,
    social_links: dbPool.social_links || null,
    target_reached_time: Number(chainData.targetReachedTime) || 0,
    chainData: chainData,
  };
}

export async function createPool(pool: Partial<Pool>): Promise<Pool> {
  try {
    const { data, error } = await supabase
      .from("pools")
      .insert([
        {
          ...pool,
          social_links: pool.social_links || null,
          status: pool.status || "draft",
          blockchain_status: pool.blockchain_status || 0,
          raised_amount: pool.raised_amount || 0,
          token_amount: pool.token_amount || 0,
          patron_count: pool.patron_count || 0,
          patrons_number: pool.patrons_number || 0,
          revenue_accumulated: pool.revenue_accumulated || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating pool:", error);
    throw error;
  }
}

export async function getPoolsByCreatorId(creatorId: string): Promise<Pool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("creator_id", creatorId);

  if (error) {
    throw error;
  }

  return data as Pool[];
}

export async function getOpenPools(): Promise<Pool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Pool[];
}

export async function updatePool(
  poolId: string,
  updates: Partial<Pool>
): Promise<Pool> {
  try {
    // Handle social links update
    if (updates.social_links !== undefined) {
      updates.social_links = updates.social_links || null;
    }

    const { data, error } = await supabase
      .from("pools")
      .update(updates)
      .eq("id", poolId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating pool:", error);
    throw error;
  }
}

export async function getUserPools(userId: string): Promise<Pool[]> {
  try {
    const { data, error } = await supabase
      .from("pools")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user pools:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserPools:", error);
    return [];
  }
}
