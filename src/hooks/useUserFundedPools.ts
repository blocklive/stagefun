import useSWR from "swr";
import { getDisplayStatus } from "../lib/contracts/types";

// Add USDC conversion helper
// USDC uses 6 decimal places
const USDC_DECIMALS = 6;
const USDC_PRECISION = Math.pow(10, USDC_DECIMALS);

// Convert from onchain units to display units
function fromUSDCBaseUnits(amount: number | string): number {
  // Parse the amount if it's a string
  const rawAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  // Divide by 10^6 to get the proper USDC amount
  return rawAmount / USDC_PRECISION;
}

// Type definitions
interface TierCommitment {
  id: string;
  user_address: string;
  pool_address: string;
  tier_address: string;
  amount: string;
  created_at: string;
}

interface Pool {
  id: string;
  unique_id?: string;
  contract_address: string;
  name: string;
  creator_address: string;
  creator_id: string;
  target_amount: string;
  revenue_accumulated: string;
  ends_at: string;
  status: string;
  created_at: string;
  image_url: string | null;
  description: string;
  lp_token_address: string | null;
  slug?: string;
  creator: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

// Type for the transformed pool data
export type TransformedPool = {
  id: string;
  contract_address: string;
  name: string;
  creator_address: string;
  raised_amount: number;
  target_amount: number;
  revenue_accumulated: number;
  ends_at: string;
  status: string;
  creator_name: string;
  creator_avatar_url: string | null;
  created_at: string;
  image_url: string | null;
  description: string;
  creator_id: string;
  slug?: string;
  // Additional fields for funded pools
  commitment_amount?: number;
  lp_token_address?: string;
  tier_name?: string;
};

// Supabase fetcher that handles multiple related queries
const fetchFundedPools = async (userWalletAddress: string) => {
  if (!userWalletAddress) {
    return [];
  }

  // Get Supabase client from window object
  const supabase = (window as any).supabase;
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  // First, get the tier commitments for this user's wallet address
  const { data: commitments, error: commitmentsError } = await supabase
    .from("tier_commitments")
    .select("*")
    .eq("user_address", userWalletAddress.toLowerCase());

  if (commitmentsError) {
    throw commitmentsError;
  }

  if (!commitments || commitments.length === 0) {
    return [];
  }

  // Extract the pool addresses from commitments
  const addressArray = commitments.map(
    (c: TierCommitment) => c.pool_address as string
  );
  const poolAddresses = [...new Set(addressArray)];

  // If we have more than one address, build a query with multiple OR conditions
  // Otherwise, just use a simple ilike
  let poolQuery = supabase
    .from("pools")
    .select(
      `
      *,
      creator:users!creator_id(id, name, avatar_url)
    `
    )
    .eq("display_public", true)
    .order("created_at", { ascending: false });

  if (poolAddresses.length === 1) {
    // Simple case: just one address to match
    poolQuery = poolQuery.ilike("contract_address", poolAddresses[0]);
  } else if (poolAddresses.length > 1) {
    // Multiple addresses: build an OR query
    // Format: .or('contract_address.ilike.addr1,contract_address.ilike.addr2,...')
    const orConditions = poolAddresses
      .map((addr) => `contract_address.ilike.${addr}`)
      .join(",");

    poolQuery = poolQuery.or(orConditions);
  }

  // Execute the query
  const { data: pools, error: poolsError } = await poolQuery;

  if (poolsError) {
    throw poolsError;
  }

  if (!pools || pools.length === 0) {
    return [];
  }

  // Transform to the expected UI format
  const transformedPools = pools.map((pool: Pool) => {
    // Get creator data
    const user = pool.creator;

    // Find this user's commitments for this pool
    const userCommitments = commitments.filter(
      (c: TierCommitment) =>
        c.pool_address.toLowerCase() === pool.contract_address.toLowerCase()
    );

    // Calculate total commitment amount for this pool
    const totalCommitment = userCommitments.reduce(
      (sum: number, commitment: TierCommitment) => {
        const amount = fromUSDCBaseUnits(parseFloat(commitment.amount || "0"));
        return sum + (isNaN(amount) ? 0 : amount);
      },
      0
    );

    // Get all commitments for this pool to calculate total raised
    const poolCommitments = commitments.filter(
      (c: TierCommitment) =>
        c.pool_address.toLowerCase() === pool.contract_address.toLowerCase()
    );

    const totalDeposits = poolCommitments.reduce(
      (sum: number, commitment: TierCommitment) => {
        const amount = fromUSDCBaseUnits(parseFloat(commitment.amount || "0"));
        return sum + (isNaN(amount) ? 0 : amount);
      },
      0
    );

    // Use a default tier name since we're not fetching tier names
    const tierName = "Backer";

    // Calculate display status
    const displayStatus = getDisplayStatus(
      pool.status || "UNKNOWN",
      pool.ends_at || new Date().toISOString(),
      totalDeposits,
      fromUSDCBaseUnits(parseFloat(pool.target_amount || "0"))
    );

    return {
      id: pool.unique_id || pool.id,
      contract_address: pool.contract_address || "",
      name: pool.name || "Unnamed Pool",
      creator_address: pool.creator_address || "",
      raised_amount: totalDeposits,
      target_amount: fromUSDCBaseUnits(parseFloat(pool.target_amount || "0")),
      revenue_accumulated: fromUSDCBaseUnits(
        parseFloat(pool.revenue_accumulated || "0")
      ),
      ends_at: pool.ends_at || new Date().toISOString(),
      status: displayStatus,
      creator_name: user?.name || "Unknown Creator",
      creator_avatar_url: user?.avatar_url || null,
      created_at: pool.created_at || new Date().toISOString(),
      image_url: pool.image_url || null,
      description: pool.description || "",
      creator_id: pool.creator_id || "",
      lp_token_address: pool.lp_token_address || undefined,
      commitment_amount: totalCommitment,
      tier_name: tierName,
      slug: pool.slug || undefined,
    };
  });

  // Custom sorting function to order pools by status and then by creation date
  const statusOrder: Record<string, number> = {
    ACTIVE: 0, // Raising
    FUNDED: 1, // Funded
    FULLY_FUNDED: 1, // Also funded
    EXECUTING: 2, // Production
    FAILED: 3, // Unfunded
    CANCELLED: 3, // Also unfunded
  };

  // Sort first by status order, then by recent creation date for same status
  const sortedPools = transformedPools.sort(
    (a: TransformedPool, b: TransformedPool) => {
      // First sort by status priority
      const statusA = a.status in statusOrder ? statusOrder[a.status] : 999;
      const statusB = b.status in statusOrder ? statusOrder[b.status] : 999;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // For pools with the same status, sort by most recent first
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  );

  // Return pools already sorted by the database
  return sortedPools;
};

export function useUserFundedPools(
  userWalletAddress: string | null | undefined
) {
  const { data, error, isLoading, mutate } = useSWR(
    userWalletAddress ? `funded-pools-${userWalletAddress}` : null,
    () => (userWalletAddress ? fetchFundedPools(userWalletAddress) : []),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  );

  return {
    pools: data || [],
    isLoading,
    error,
    refresh: mutate,
    totalCount: data?.length || 0,
    isUsingCache: false,
  };
}

export default useUserFundedPools;
