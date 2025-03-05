import { supabase, getAuthenticatedSupabaseClient, Pool } from "../supabase";
import { createPoolOnChain } from "./contract-service";
import { ethers } from "ethers";

export async function createPool(
  poolData: Omit<Pool, "id" | "created_at" | "creator_id">,
  userId?: string // Optional userId parameter
): Promise<Pool> {
  try {
    // Get the authenticated Supabase client
    const authClient = await getAuthenticatedSupabaseClient();

    // Add the creator_id to the pool data
    const fullPoolData = {
      ...poolData,
      creator_id: userId,
      // Add raised_amount if it's missing
      raised_amount: poolData.raised_amount || 0,
    };

    console.log("Creating pool with data:", fullPoolData);

    // Insert the pool using the authenticated client
    const { data, error } = await authClient
      .from("pools")
      .insert(fullPoolData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Create the pool on the blockchain
    try {
      // Get the user's wallet address
      const { data: userData } = await authClient
        .from("users")
        .select("wallet_address")
        .eq("id", userId)
        .single();

      if (!userData?.wallet_address) {
        throw new Error("User wallet address not found");
      }

      // Get the provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(userData.wallet_address);

      const { receipt, poolId } = await createPoolOnChain(
        signer,
        poolData.name
      );

      // Get the LP token address from the PoolCreated event
      const poolCreatedEvent = receipt.logs.find(
        (log: any) => log.eventName === "PoolCreated"
      );
      if (!poolCreatedEvent) {
        throw new Error("PoolCreated event not found");
      }

      // Parse the event data
      const iface = new ethers.Interface([
        "event PoolCreated(bytes32 indexed poolId, string name, address lpTokenAddress)",
      ]);
      const parsedLog = iface.parseLog({
        topics: poolCreatedEvent.topics,
        data: poolCreatedEvent.data,
      });

      if (!parsedLog) {
        throw new Error("Failed to parse PoolCreated event");
      }

      const lpTokenAddress = parsedLog.args[2]; // lpTokenAddress is the third argument

      // Update the pool with the contract address
      const { error: updateError } = await authClient
        .from("pools")
        .update({
          contract_address: lpTokenAddress,
          blockchain_tx_hash: receipt.hash,
          blockchain_block_number: receipt.blockNumber,
          blockchain_status: "confirmed",
        })
        .eq("id", data.id);

      if (updateError) {
        console.error(
          "Error updating pool with contract address:",
          updateError
        );
        throw updateError;
      }

      // Update the returned data with the contract address
      data.contract_address = lpTokenAddress;
    } catch (error) {
      console.error("Error creating pool on blockchain:", error);
      // Don't throw here, as the pool was created in the database
    }

    return data as Pool;
  } catch (error) {
    console.error("Error in createPool:", error);
    throw error;
  }
}

export async function getPoolById(poolId: string): Promise<Pool | null> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned (pool not found)
      return null;
    }
    throw error;
  }

  return data as Pool;
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

export async function getAllPools(): Promise<Pool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all pools:", error);
    return [];
  }

  return data || [];
}

export async function updatePool(
  poolId: string,
  updates: Partial<Pool>
): Promise<Pool | null> {
  const { data, error } = await supabase
    .from("pools")
    .update(updates)
    .eq("id", poolId)
    .select()
    .single();

  if (error) {
    console.error("Error updating pool:", error);
    return null;
  }

  return data;
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
