import { supabase, Patron, User } from "../supabase";

export async function commitToPool(
  userId: string,
  poolId: string,
  amount: number
): Promise<Patron> {
  const { data, error } = await supabase
    .from("patrons")
    .upsert(
      {
        user_id: userId,
        pool_id: poolId,
        amount: amount,
        verified: false,
      },
      { onConflict: "user_id,pool_id" }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update the pool's raised amount
  await supabase.rpc("update_pool_raised_amount", {
    p_pool_id: poolId,
  });

  return data as Patron;
}

export async function getPatronsByPoolId(poolId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("patrons")
    .select(`*, user:users(*)`)
    .eq("pool_id", poolId);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPoolsByPatron(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("patrons")
    .select("pool_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data || []).map((patron) => patron.pool_id);
}

export async function verifyPatron(patronId: string): Promise<boolean> {
  const { error } = await supabase
    .from("patrons")
    .update({ verified: true })
    .eq("id", patronId);

  if (error) {
    console.error("Error verifying patron:", error);
    return false;
  }

  return true;
}
