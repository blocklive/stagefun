import { supabase, getAuthenticatedSupabaseClient, Pool } from "../supabase";

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
