import { useCallback, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import useSWR from "swr";
import { getDisplayStatus } from "@/lib/contracts/types";

// Initialize Supabase client for direct queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

// Define types
export type TabType = "open" | "funded";
export type PoolTypeFilter = "all" | "my";

export type OnChainPool = {
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
};

interface UsePoolsWithDepositsHomepageReturn {
  pools: OnChainPool[];
  isLoading: boolean;
  error: any;
  isDbError: boolean;
  refresh: () => void;
  fetchPoolsForTab: (tab: TabType, poolType?: PoolTypeFilter) => Promise<void>;
}

// Fetcher function for SWR
const fetchPools = async (key: string): Promise<OnChainPool[]> => {
  // Parse the SWR key to get parameters
  const [, tab, maxItems, userId, poolType] = key.split("|");
  const tabType = tab as TabType;
  const maxItemsNum = parseInt(maxItems, 10);
  const poolTypeFilter = poolType as PoolTypeFilter;

  // For the funded tab, we need to fetch multiple pages to ensure we get enough pools
  if (tabType === "funded") {
    let allPools: OnChainPool[] = [];
    let pageCount = 1;
    let hasMorePages = true;
    const POOLS_PER_PAGE = 25;

    // Keep fetching pages until we have enough funded pools or run out of data
    while (allPools.length < maxItemsNum && hasMorePages && pageCount <= 5) {
      const from = (pageCount - 1) * POOLS_PER_PAGE;
      const to = from + POOLS_PER_PAGE - 1;

      // Build query based on pool type filter
      let query = supabase
        .from("pools")
        .select(
          `
          *,
          creator:users!creator_id(id, name, avatar_url)
        `
        )
        .eq("display_public", true)
        .order("created_at", { ascending: false });

      // Apply creator filter if needed
      if (poolTypeFilter === "my" && userId) {
        query = query.eq("creator_id", userId);
      }

      // Complete the query with range
      const { data: poolsPage, error: poolError } = await query.range(from, to);

      if (poolError) {
        console.error("Error fetching pools:", poolError);
        throw poolError;
      }

      if (!poolsPage || poolsPage.length === 0) {
        hasMorePages = false;
        break;
      }

      // Get all pool addresses to use for deposit lookup
      const poolAddresses = poolsPage
        .map((pool) => pool.contract_address?.toLowerCase())
        .filter(Boolean);

      // Get deposits for all pools
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

      // Transform the data
      const transformedPools = poolsPage.map((pool) => {
        // Look up deposits using normalized address (lowercase)
        const normalizedAddress = pool.contract_address?.toLowerCase();
        const totalDeposits = normalizedAddress
          ? depositsByPool.get(normalizedAddress) || 0
          : 0;

        const transformedPool = {
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
          creator_name: pool.creator?.name || "Unknown Creator",
          creator_avatar_url: pool.creator?.avatar_url || null,
          created_at: pool.created_at || new Date().toISOString(),
          image_url: pool.image_url || null,
          description: pool.description || "",
          creator_id: pool.creator_id || "",
          slug: pool.slug || undefined,
        };

        // Apply the getDisplayStatus logic to get the actual current status
        transformedPool.status = getDisplayStatus(
          transformedPool.status,
          transformedPool.ends_at,
          transformedPool.raised_amount,
          transformedPool.target_amount
        );

        return transformedPool;
      });

      // Filter for funded status (now only EXECUTING and COMPLETED)
      const fundedPools = transformedPools.filter((pool) =>
        ["EXECUTING", "COMPLETED"].includes(pool.status)
      );

      // Add to our collection
      allPools = [...allPools, ...fundedPools];
      pageCount++;
    }

    return allPools.slice(0, maxItemsNum);
  } else if (tabType === "open") {
    // For the open tab, fetch pools that are before end date and in open statuses
    // Build query based on pool type filter
    let query = supabase
      .from("pools")
      .select(
        `
        *,
        creator:users!creator_id(id, name, avatar_url)
      `
      )
      .eq("display_public", true)
      .order("created_at", { ascending: false });

    // Apply creator filter if needed
    if (poolTypeFilter === "my" && userId) {
      query = query.eq("creator_id", userId);
    }

    // Complete the query with limit
    const { data: poolsPage, error: poolError } = await query.limit(50); // Fetch more to ensure we have enough after filtering

    if (poolError) {
      console.error("Error fetching pools:", poolError);
      throw poolError;
    }

    if (!poolsPage) {
      return [];
    }

    // Get all pool addresses to use for deposit lookup
    const poolAddresses = poolsPage
      .map((pool) => pool.contract_address?.toLowerCase())
      .filter(Boolean);

    // Get deposits for all pools
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

    const transformedPools = poolsPage.map((pool) => {
      // Look up deposits using normalized address (lowercase)
      const normalizedAddress = pool.contract_address?.toLowerCase();
      const totalDeposits = normalizedAddress
        ? depositsByPool.get(normalizedAddress) || 0
        : 0;

      const transformedPool = {
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
        status: pool.status || "UNKNOWN",
        creator_name: pool.creator?.name || "Unknown Creator",
        creator_avatar_url: pool.creator?.avatar_url || null,
        created_at: pool.created_at || new Date().toISOString(),
        image_url: pool.image_url || null,
        description: pool.description || "",
        creator_id: pool.creator_id || "",
        slug: pool.slug || undefined,
      };

      // Apply the getDisplayStatus logic to get the actual current status
      transformedPool.status = getDisplayStatus(
        transformedPool.status,
        transformedPool.ends_at,
        transformedPool.raised_amount,
        transformedPool.target_amount
      );

      return transformedPool;
    });

    // Filter for open pools (ACTIVE, PAUSED, FUNDED, FULLY_FUNDED) that are before end date
    const now = new Date();
    const openPools = transformedPools.filter((pool) => {
      // Must be in one of the open statuses
      if (
        !["ACTIVE", "PAUSED", "FUNDED", "FULLY_FUNDED"].includes(pool.status)
      ) {
        return false;
      }

      // Must be before the end date
      const endDate = new Date(pool.ends_at);
      return endDate > now;
    });

    return openPools.slice(0, maxItemsNum);
  } else {
    // Unknown tab type, return empty array
    console.warn(`Unknown tab type: ${tabType}`);
    return [];
  }
};

export const usePoolsWithDepositsHomePage = (
  initialTab: TabType = "open",
  maxItems: number = 15,
  userId?: string,
  initialPoolType: PoolTypeFilter = "all"
): UsePoolsWithDepositsHomepageReturn => {
  // Track the current active tab internally
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  // Track the pool type filter
  const [poolTypeFilter, setPoolTypeFilter] =
    useState<PoolTypeFilter>(initialPoolType);

  // Use SWR with the current tab state and pool type filter
  const {
    data: pools = [],
    error: swrError,
    isLoading,
    mutate,
  } = useSWR(
    `pools|${activeTab}|${maxItems}|${userId || ""}|${poolTypeFilter}`,
    fetchPools,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateIfStale: true,
      dedupingInterval: 10000, // Increase to prevent oscillations
      errorRetryCount: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Track whether the error is a DB error
  const isDbError = swrError ? true : false;
  const error = swrError;

  // Force a refresh of the data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Function to change the tab and pool type and fetch data
  const fetchPoolsForTab = useCallback(
    async (tab: TabType, poolType?: PoolTypeFilter) => {
      // Set the active tab - this will change the SWR key and trigger a fetch
      setActiveTab(tab);

      // Update pool type filter if provided
      if (poolType) {
        setPoolTypeFilter(poolType);
      }
    },
    []
  );

  return {
    pools,
    isLoading,
    error,
    isDbError,
    refresh,
    fetchPoolsForTab,
  };
};
