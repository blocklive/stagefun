import { supabase, Patron, User } from "../supabase";
import { ethers } from "ethers";
import { POOL_ABI } from "../abi/pool-abi";

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

/**
 * Get patrons (LP token holders) for a specific pool
 * @param poolAddress The address of the pool contract
 * @param provider The ethers provider to use
 * @returns Array of patrons with their LP token balances
 */
export async function getPoolPatrons(
  poolAddress: string,
  provider: ethers.Provider
) {
  try {
    // Get all users who have committed to this pool from Supabase
    const { data: commitments, error } = await supabase
      .from("pool_commitments")
      .select("user_id, wallet_address")
      .eq("pool_address", poolAddress)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching commitments:", error);
      throw error;
    }

    if (!commitments || commitments.length === 0) {
      return [];
    }

    // Get unique wallet addresses
    const walletAddresses = [
      ...new Set(commitments.map((c) => c.wallet_address)),
    ];

    // Create contract instance
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

    // Get LP balances for all addresses
    const balances = await poolContract.getLpBalances(walletAddresses);

    // Get user details from Supabase
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, avatar_url, display_name")
      .in(
        "id",
        commitments.map((c) => c.user_id)
      );

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Create a map of wallet address to user
    const walletToUserMap = new Map();
    commitments.forEach((commitment) => {
      const user = users?.find((u) => u.id === commitment.user_id);
      if (user) {
        walletToUserMap.set(commitment.wallet_address.toLowerCase(), user);
      }
    });

    // Combine the data
    const patrons = walletAddresses.map((address, index) => {
      const balance = balances[index];
      const user = walletToUserMap.get(address.toLowerCase());

      return {
        address,
        balance: balance.toString(),
        userId: user?.id || null,
        username: user?.username || null,
        displayName: user?.display_name || null,
        avatarUrl: user?.avatar_url || null,
      };
    });

    // Filter out zero balances and sort by balance (highest first)
    return patrons
      .filter((patron) => ethers.getBigInt(patron.balance) > BigInt(0))
      .sort((a, b) => {
        const balanceA = ethers.getBigInt(a.balance);
        const balanceB = ethers.getBigInt(b.balance);
        return balanceB > balanceA ? 1 : -1;
      });
  } catch (error) {
    console.error("Error getting pool patrons:", error);
    throw error;
  }
}
