import { useState, useRef } from "react";
import useSWR from "swr";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POOLS_PER_PAGE = 25; // Number of pools to fetch per page
const MAX_RETRIES = 3; // Maximum number of retries for failed requests
const RETRY_DELAY = 2000; // Delay between retries in milliseconds

// Add USDC conversion helper at the top of the file
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
};

// Map from UI filter terms to database status strings
const STATUS_MAP: Record<string, string[]> = {
  // Main filters
  active: ["ACTIVE"],
  open: ["ACTIVE"],
  funded: ["FUNDED", "FULLY_FUNDED", "EXECUTING"],
  unfunded: ["FAILED", "CANCELLED"],
  completed: ["COMPLETED"],
  failed: ["FAILED", "CANCELLED"],

  // Common variations
  live: ["ACTIVE"], // Another alias for active
  inprogress: ["EXECUTING"], // Just executing
  canceled: ["CANCELLED"], // Alternative spelling
  cancelled: ["CANCELLED"],

  // Individual status filters
  executing: ["EXECUTING"],
  paused: ["PAUSED"],
  closed: ["CLOSED"],
  inactive: ["INACTIVE"],
};

export function usePoolsWithDeposits(page: number = 1, status?: string) {
  const [currentPage, setCurrentPage] = useState(page);
  const [hasMore, setHasMore] = useState(true);

  // Add state to store the last successfully fetched data
  const [cachedPools, setCachedPools] = useState<TransformedPool[]>([]);
  const [isDbError, setIsDbError] = useState(false);
  const retryCountRef = useRef(0);

  // Fetch pools from Supabase
  const {
    data: poolsData,
    error,
    isLoading,
    mutate: refreshPools,
  } = useSWR(
    ["db-pools", currentPage, status],
    async () => {
      try {
        setIsDbError(false);

        // Calculate pagination values
        const from = (currentPage - 1) * POOLS_PER_PAGE;
        const to = from + POOLS_PER_PAGE - 1;

        // First, get the pools from the pools table - with creator join
        // OPTIMIZATION 1: Join with users table directly instead of separate query
        let poolQuery = supabase
          .from("pools")
          .select(
            `
            *,
            creator:users!creator_id(id, name, avatar_url)
          `
          )
          .eq("display_public", true);

        // Apply status filter based on the string status field
        if (status) {
          const statusKey = status.toLowerCase();
          const statusValues = STATUS_MAP[statusKey];
          console.log(
            `Filter status: "${status}" (key: "${statusKey}"), maps to DB values:`,
            statusValues
          );

          if (statusValues && statusValues.length > 0) {
            poolQuery = poolQuery.in("status", statusValues);
          } else {
            // If we don't recognize the filter, log a warning but don't filter
            // This ensures pools still show up even with unknown filters
            console.warn(
              `Unknown status filter: "${status}" - showing all pools`
            );
          }
        }

        // Get total count separately to avoid relationship issues
        const countQuery = supabase
          .from("pools")
          .select("id", { count: "exact", head: true })
          .eq("display_public", true);

        // Apply same status filter to count query if provided
        if (status) {
          const statusKey = status.toLowerCase();
          const statusValues = STATUS_MAP[statusKey];

          if (statusValues && statusValues.length > 0) {
            countQuery.in("status", statusValues);
          }
          // Don't filter if unknown status (same as main query)
        }

        // Run count query
        const { count } = await countQuery;

        // Add pagination and ordering to main query
        poolQuery = poolQuery
          .order("created_at", { ascending: false })
          .range(from, to);

        // Get the pools data
        const { data: pools, error: poolError } = await poolQuery;

        if (poolError) {
          console.error("Error fetching pools from database:", poolError);
          throw poolError;
        }

        // Check if there are more pools available
        setHasMore(count !== null && from + pools.length < count);

        if (!pools || pools.length === 0) {
          return {
            pools: [],
            allPoolsCount: 0,
            isUsingCache: false,
          };
        }

        // Get all pool addresses to use in queries - normalize to lowercase
        const poolAddresses = pools
          .map((pool) => pool.contract_address?.toLowerCase())
          .filter(Boolean);

        // Skip tier_commitments lookup if no poolAddresses exist
        if (poolAddresses.length === 0) {
          console.warn("No valid pool addresses found");
          return {
            pools: [],
            allPoolsCount: 0,
            isUsingCache: false,
          };
        }

        // OPTIMIZATION 2: Get deposits for all pools in a single query
        // This part needs to remain as a separate query since there's no FK relationship
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

        // Transform to the expected UI format with direct status mapping
        const transformedPools = pools.map((pool) => {
          // OPTIMIZATION 3: Use the joined creator data directly
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
            status: pool.status || "UNKNOWN", // Use status directly from DB
            creator_name: user?.name || "Unknown Creator",
            creator_avatar_url: user?.avatar_url || null,
            created_at: pool.created_at || new Date().toISOString(),
            image_url: pool.image_url || null,
            description: pool.description || "",
            creator_id: pool.creator_id || "",
          };
        });

        // Store the successfully fetched data in our cache
        setCachedPools(transformedPools);
        retryCountRef.current = 0; // Reset retry count on successful fetch

        const result = {
          pools: transformedPools,
          allPoolsCount: count || transformedPools.length,
          isUsingCache: false,
        };
        console.log("RETURNING FROM HOOK **", result);
        return result;
      } catch (error) {
        console.error("Error fetching pools:", error);

        // Set database error state
        setIsDbError(true);

        // Implement retry logic
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          console.log(
            `Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`
          );

          // Schedule a retry after delay
          setTimeout(() => {
            refreshPools();
          }, RETRY_DELAY);
        }

        // If we have cached data, use it instead of returning an empty array
        if (cachedPools.length > 0) {
          console.log("Using cached pool data due to database error");

          // Handle pagination for cached data
          const startIndex = (currentPage - 1) * POOLS_PER_PAGE;
          const endIndex = startIndex + POOLS_PER_PAGE;
          const paginatedCachedPools = cachedPools.slice(startIndex, endIndex);

          return {
            pools: paginatedCachedPools,
            allPoolsCount: cachedPools.length,
            isUsingCache: true,
          };
        }

        return {
          pools: [],
          allPoolsCount: 0,
          isUsingCache: false,
        };
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      errorRetryCount: 3, // SWR's built-in retry count
    }
  );

  // Function to load more pools
  const loadMore = () => {
    if (!hasMore) return;
    setCurrentPage((prev) => prev + 1);
  };

  // Force refresh function that resets retry count
  const forceRefresh = () => {
    retryCountRef.current = 0;
    refreshPools();
  };

  // Note: Track what's actually being returned from the hook
  const result = {
    pools: poolsData?.pools || [],
    isLoading,
    error,
    isDbError,
    hasMore,
    loadMore,
    refresh: forceRefresh,
    totalCount: poolsData?.allPoolsCount || 0,
    isUsingCache: poolsData?.isUsingCache || false,
  };
  return result;
}
