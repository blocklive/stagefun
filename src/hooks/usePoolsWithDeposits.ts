import { useEffect, useState } from "react";
import useSWR from "swr";
import { Pool } from "../lib/supabase";
import { ethers } from "ethers";
import {
  getStageDotFunPoolFactoryContract,
  getPoolContract,
  getPoolDetails,
  fromUSDCBaseUnits,
} from "../lib/contracts/StageDotFunPool";
import { getAllPools } from "../lib/services/pool-service";

const POOLS_PER_PAGE = 10; // Number of pools to fetch per page

export function usePoolsWithDeposits(page: number = 1, status?: string) {
  const [hasMore, setHasMore] = useState(true);

  // Fetch pools from database with pagination
  const {
    data: pools,
    error: dbError,
    isLoading: isDbLoading,
    mutate: refreshPools,
  } = useSWR(
    ["pools", page, status],
    async () => {
      const allPools = await getAllPools();
      if (!allPools) return [];

      const filteredPools = status
        ? allPools.filter((pool) => pool.status === status)
        : allPools;

      const startIndex = (page - 1) * POOLS_PER_PAGE;
      const endIndex = startIndex + POOLS_PER_PAGE;
      const paginatedPools = filteredPools.slice(startIndex, endIndex);

      setHasMore(endIndex < filteredPools.length);
      return paginatedPools;
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Fetch on-chain data for each pool
  const {
    data: chainData,
    error: chainError,
    isLoading: isChainLoading,
    mutate: refreshChainData,
  } = useSWR(
    pools?.length ? ["chainData", pools.map((p) => p.contract_address)] : null,
    async () => {
      if (!pools?.length) return [];

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
          ? "https://testnet-rpc.monad.xyz"
          : "https://sepolia.base.org"
      );

      const factory = getStageDotFunPoolFactoryContract(provider);

      // Get pool addresses and details
      const poolData = await Promise.all(
        pools.map(async (pool) => {
          if (!pool.contract_address) return null;

          try {
            // First check if the contract exists at this address
            const code = await provider.getCode(pool.contract_address);
            if (code === "0x") {
              console.warn(
                `No contract found at address: ${pool.contract_address}`
              );
              return {
                address: pool.contract_address,
                totalDeposits: 0,
                status: 0,
                error: "Contract not found",
              };
            }

            // Try to get pool details
            const details = await getPoolDetails(
              provider,
              pool.contract_address
            );

            return {
              address: pool.contract_address,
              totalDeposits: fromUSDCBaseUnits(details.totalDeposits), // Convert using utility function
              status: details.status,
            };
          } catch (error) {
            console.error(
              `Error fetching data for pool ${pool.id} at ${pool.contract_address}:`,
              error
            );
            // Return fallback data instead of null
            return {
              address: pool.contract_address,
              totalDeposits: 0,
              status: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      // Filter out null values but keep error entries
      return poolData.filter((data) => data !== null);
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
    }
  );

  // Combine database and chain data
  const combinedPools =
    pools?.map((pool) => {
      const chainInfo = chainData?.find(
        (data) =>
          data.address.toLowerCase() === pool.contract_address?.toLowerCase()
      );

      return {
        ...pool,
        raised_amount: chainInfo?.totalDeposits || 0,
        blockchain_status: chainInfo?.status === 1 ? "active" : "inactive",
      };
    }) || [];

  // Function to load more pools
  const loadMore = () => {
    if (!hasMore) return;
    refreshPools();
  };

  return {
    pools: combinedPools,
    isLoading: isDbLoading || isChainLoading,
    error: dbError || chainError,
    hasMore,
    loadMore,
    refresh: () => {
      refreshPools();
      refreshChainData();
    },
  };
}
