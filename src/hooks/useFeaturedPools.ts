import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { TransformedPool } from "./usePoolsWithDeposits";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// USDC conversion helper
const USDC_DECIMALS = 6;
const USDC_PRECISION = Math.pow(10, USDC_DECIMALS);

// Convert from onchain units to display units
function fromUSDCBaseUnits(amount: number | string): number {
  // Parse the amount if it's a string
  const rawAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  // Divide by 10^6 to get the proper USDC amount
  return rawAmount / USDC_PRECISION;
}

export function useFeaturedPools() {
  const [featuredPools, setFeaturedPools] = useState<TransformedPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFeaturedPools() {
      try {
        setIsLoading(true);

        // Get the pools from the pools table that have a featured value
        const { data: pools, error: poolError } = await supabase
          .from("pools")
          .select(
            `
            *,
            creator:users!creator_id(id, name, avatar_url)
          `
          )
          .not("featured", "is", null)
          .eq("display_public", true)
          .order("featured", { ascending: true });

        if (poolError) {
          throw poolError;
        }

        if (!pools || pools.length === 0) {
          setFeaturedPools([]);
          setIsLoading(false);
          return;
        }

        // Get all pool addresses to use in queries - normalize to lowercase
        const poolAddresses = pools
          .map((pool) => pool.contract_address?.toLowerCase())
          .filter(Boolean);

        // Get deposits for all pools in a single query
        const { data: depositData } =
          poolAddresses.length > 0
            ? await supabase
                .from("tier_commitments")
                .select("pool_address, amount")
                .in("pool_address", poolAddresses)
            : { data: [] };

        // Group deposits by pool address (case insensitive)
        const depositsByPool = new Map();
        if (depositData && depositData.length > 0) {
          depositData.forEach((deposit) => {
            const poolAddress = deposit.pool_address?.toLowerCase();
            if (!poolAddress) return;

            // Parse amount safely and convert from onchain units
            let amount = 0;
            try {
              // First parse to get the raw amount
              const rawAmount = parseFloat(deposit.amount || "0");
              // Then convert from onchain precision to display units
              amount = fromUSDCBaseUnits(rawAmount);
              if (isNaN(amount)) amount = 0;
            } catch (e) {
              console.warn("Error parsing amount:", deposit.amount, e);
              amount = 0;
            }

            if (!depositsByPool.has(poolAddress)) {
              depositsByPool.set(poolAddress, 0);
            }

            depositsByPool.set(
              poolAddress,
              depositsByPool.get(poolAddress) + amount
            );
          });
        }

        // Transform to the expected UI format
        const transformedPools = pools.map((pool) => {
          // Use the joined creator data directly
          const user = pool.creator;

          // Look up deposits using normalized address (lowercase)
          const normalizedAddress = pool.contract_address?.toLowerCase();
          const totalDeposits = normalizedAddress
            ? depositsByPool.get(normalizedAddress) || 0
            : 0;

          return {
            id: pool.unique_id || pool.id,
            contract_address: pool.contract_address || "",
            name: pool.name || "Unnamed Pool",
            creator_address: pool.creator_address || "",
            raised_amount: totalDeposits,
            target_amount: fromUSDCBaseUnits(
              parseFloat(pool.target_amount || "0")
            ),
            revenue_accumulated: fromUSDCBaseUnits(
              parseFloat(pool.revenue_accumulated || "0")
            ),
            ends_at: pool.ends_at || new Date().toISOString(),
            status: pool.status || "UNKNOWN",
            creator_name: user?.name || "Unknown Creator",
            creator_avatar_url: user?.avatar_url || null,
            created_at: pool.created_at || new Date().toISOString(),
            image_url: pool.image_url || null,
            description: pool.description || "",
            creator_id: pool.creator_id || "",
            featured: pool.featured || null,
          };
        });

        // Sort by featured value (important if order got mixed up)
        transformedPools.sort((a, b) => (a.featured || 0) - (b.featured || 0));

        setFeaturedPools(transformedPools);
        setError(null);
      } catch (err) {
        console.error("Error fetching featured pools:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeaturedPools();
  }, []);

  return { featuredPools, isLoading, error };
}
