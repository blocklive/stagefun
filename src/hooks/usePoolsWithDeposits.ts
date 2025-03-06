import { useEffect, useState } from "react";
import useSWR from "swr";
import { Pool } from "../lib/supabase";
import { ethers } from "ethers";
import {
  getStageDotFunPoolFactoryContract,
  getPoolContract,
  getPoolDetails,
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

          const poolAddress = await factory.getPoolByAddress(
            pool.contract_address
          );
          if (!poolAddress) return null;

          const details = await getPoolDetails(provider, pool.contract_address);

          return {
            address: pool.contract_address,
            totalDeposits: Number(details.totalDeposits),
            status: details.status,
          };
        })
      );

      return poolData.filter(
        (data): data is NonNullable<typeof data> => data !== null
      );
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
        blockchain_status: chainInfo?.status || 0,
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
