import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import {
  getDeployedPoolsDetails,
  PoolListItem,
  fromUSDCBaseUnits,
} from "../lib/contracts/StageDotFunPool";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POOLS_PER_PAGE = 10; // Number of pools to fetch per page
const MAX_RETRIES = 3; // Maximum number of retries for failed requests
const RETRY_DELAY = 2000; // Delay between retries in milliseconds

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
  blockchain_status: string;
};

export function usePoolsWithDeposits(page: number = 1, status?: string) {
  const [currentPage, setCurrentPage] = useState(page);
  const [hasMore, setHasMore] = useState(true);

  // Add state to store the last successfully fetched data
  const [cachedPools, setCachedPools] = useState<TransformedPool[]>([]);
  const [isRpcError, setIsRpcError] = useState(false);
  const retryCountRef = useRef(0);

  // Fetch all pool data directly from the blockchain in a single call
  const {
    data: poolsData,
    error,
    isLoading,
    mutate: refreshPools,
  } = useSWR(
    ["onchain-pools", currentPage, status],
    async () => {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      try {
        setIsRpcError(false);
        // Get all pool details in a single call
        const poolListItems = await getDeployedPoolsDetails(provider);

        // Extract all unique IDs to fetch matching data from Supabase
        const uniqueIds = poolListItems.map((item) => item.uniqueId);

        // Fetch matching pool data from Supabase in a single call
        const { data: supabasePools, error: supabaseError } = await supabase
          .from("pools")
          .select(
            `
            id,
            image_url,
            creator_id,
            created_at,
            creator:creator_id (
              name,
              avatar_url
            ),
            description
          `
          )
          .in("id", uniqueIds);

        if (supabaseError) {
          console.error(
            "Error fetching pool data from Supabase:",
            supabaseError
          );
        }

        // Create a map of Supabase data by ID for easy lookup
        const supabasePoolsMap = new Map();
        if (supabasePools) {
          supabasePools.forEach((pool) => {
            supabasePoolsMap.set(pool.id, pool);
          });
        }

        // Transform the data to match the expected format in the UI
        const transformedPools = poolListItems.map((item) => {
          // Look up matching Supabase data
          const supabaseData = supabasePoolsMap.get(item.uniqueId);

          return {
            id: item.uniqueId, // Use uniqueId as the primary identifier
            contract_address: item.address,
            name: item.name,
            creator_address: item.creator,
            raised_amount: fromUSDCBaseUnits(item.totalDeposits),
            target_amount: fromUSDCBaseUnits(item.targetAmount),
            revenue_accumulated: fromUSDCBaseUnits(item.revenueAccumulated),
            ends_at: new Date(Number(item.endTime) * 1000).toISOString(), // Convert to ISO string
            status: item.status === 1 ? "active" : "inactive",
            // Use Supabase data if available, otherwise use defaults
            creator_name: supabaseData?.creator?.name || "On-chain Pool",
            creator_avatar_url: supabaseData?.creator?.avatar_url || null,
            created_at: supabaseData?.created_at || new Date().toISOString(), // Use Supabase created_at if available
            image_url: supabaseData?.image_url || null,
            description: supabaseData?.description || "",
            creator_id: supabaseData?.creator_id || "",
            blockchain_status: item.status === 1 ? "active" : "inactive",
          };
        });

        // Filter by status if needed
        const filteredPools = status
          ? transformedPools.filter((pool) => pool.status === status)
          : transformedPools;

        // Sort by most recent (we don't have created_at from blockchain, so we'll use address as a proxy)
        const sortedPools = [...filteredPools].sort((a, b) =>
          a.contract_address.toLowerCase() > b.contract_address.toLowerCase()
            ? -1
            : 1
        );

        // Handle pagination
        const startIndex = (currentPage - 1) * POOLS_PER_PAGE;
        const endIndex = startIndex + POOLS_PER_PAGE;
        const paginatedPools = sortedPools.slice(startIndex, endIndex);

        setHasMore(endIndex < sortedPools.length);

        // Store the successfully fetched data in our cache
        setCachedPools(sortedPools);
        retryCountRef.current = 0; // Reset retry count on successful fetch

        return {
          pools: paginatedPools,
          allPoolsCount: sortedPools.length,
        };
      } catch (error) {
        console.error("Error fetching pool details from blockchain:", error);

        // Set RPC error state
        setIsRpcError(true);

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
          console.log("Using cached pool data due to RPC error");

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

        // If no cached data, return empty array
        return {
          pools: [],
          allPoolsCount: 0,
          isUsingCache: false,
        };
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds (increased from 10s to reduce load)
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

  return {
    pools: poolsData?.pools || [],
    isLoading,
    error,
    isRpcError,
    hasMore,
    loadMore,
    refresh: forceRefresh,
    totalCount: poolsData?.allPoolsCount || 0,
    isUsingCache: poolsData?.isUsingCache || false,
  };
}
