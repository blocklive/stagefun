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

        // First, get the pools from the pools table
        let poolQuery = supabase.from("pools").select("*");

        // Only show pools where display_public is true
        poolQuery = poolQuery.eq("display_public", true);

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
          .select("*", { count: "exact", head: true })
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

        console.log("POOL DATA **", pools);

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
        console.log("Pool addresses (normalized):", poolAddresses);

        // Skip user lookup if no poolAddresses exist
        if (poolAddresses.length === 0) {
          console.warn("No valid pool addresses found");
          return {
            pools: [],
            allPoolsCount: 0,
            isUsingCache: false,
          };
        }

        // Get creator IDs from the pools table (these are public.users.id values)
        const creatorIds = pools.map((pool) => pool.creator_id).filter(Boolean);

        console.log("Creator IDs:", creatorIds);

        // Fetch all creators by their user IDs
        const { data: users } =
          creatorIds.length > 0
            ? await supabase
                .from("users")
                .select("id, name, avatar_url")
                .in("id", creatorIds)
            : { data: [] };

        console.log("Found creators:", users);

        // Create a map of user profiles for easy lookup by ID
        const userMap = new Map();
        if (users) {
          users.forEach((user) => {
            userMap.set(user.id, user);
          });
        }

        // Get deposits for all pools in a single query
        const { data: depositData } =
          poolAddresses.length > 0
            ? await supabase
                .from("tier_commitments")
                .select("pool_address, amount")
                .in("pool_address", poolAddresses)
            : { data: [] };

        console.log("DEPOSIT DATA **", depositData);

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

        // Log the deposit totals we've calculated
        console.log(
          "DEPOSIT TOTALS BY POOL:",
          Array.from(depositsByPool.entries()).map(([addr, amount]) => ({
            address: addr,
            total: amount,
          }))
        );

        // Transform to the expected UI format with direct status mapping
        const transformedPools = pools.map((pool) => {
          // Look up user by creator_id (public.users.id)
          const user = pool.creator_id ? userMap.get(pool.creator_id) : null;

          // Look up deposits using normalized address (lowercase)
          const normalizedAddress = pool.contract_address?.toLowerCase();
          const totalDeposits = normalizedAddress
            ? depositsByPool.get(normalizedAddress) || 0
            : 0;

          console.log(
            `Pool ${pool.name} (${normalizedAddress}): deposits = ${totalDeposits}`
          );

          return {
            id: pool.unique_id || pool.id,
            contract_address: pool.contract_address || "",
            name: pool.name || "Unnamed Pool",
            creator_address: pool.creator_address || "",
            raised_amount: totalDeposits,
            target_amount: parseFloat(pool.target_amount || "0"),
            revenue_accumulated: parseFloat(pool.revenue_accumulated || "0"),
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

        console.log("TRANSFORMED POOLS **", transformedPools);

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
  console.log("HOOK FINAL RETURN **", result);
  return result;
}
