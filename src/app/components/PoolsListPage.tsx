"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../contexts/SupabaseContext";
import {
  usePoolsWithDeposits,
  PoolTypeFilter,
  PoolSortOption,
} from "../../hooks/usePoolsWithDeposits";
import PoolsListGrid from "./pools/PoolsListGrid";

type TabType = "open" | "funded" | "unfunded";

export default function PoolsListPage() {
  const router = useRouter();
  const { dbUser } = useSupabase();
  const [activeTab, setActiveTab] = useState<TabType>("open");
  const [page, setPage] = useState(1);
  const [allPools, setAllPools] = useState<any[]>([]);
  const [poolType, setPoolType] = useState<PoolTypeFilter>("all");
  const [sortBy, setSortBy] = useState<PoolSortOption>("recent");

  // Update active tab when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabType;
      if (tab && ["open", "funded", "unfunded"].includes(tab)) {
        setActiveTab(tab);
        // Reset page and pools when tab changes
        setPage(1);
        setAllPools([]);
      }

      // Also get poolType from URL if present
      const type = params.get("type") as PoolTypeFilter;
      if (type && ["all", "my"].includes(type)) {
        setPoolType(type);
      }

      // Get sortBy from URL if present
      const sort = params.get("sort") as PoolSortOption;
      if (
        sort &&
        ["recent", "amount", "alphabetical", "volume"].includes(sort)
      ) {
        setSortBy(sort);
      }
    };

    // Set initial state
    handleUrlChange();

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    // Only update if tab is changing
    if (tab !== activeTab) {
      console.log(`Changing tab to: ${tab}`);
      // Reset paging when tab changes
      setPage(1);
      setAllPools([]);
      setActiveTab(tab);

      // Update URL without scrolling to top
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("tab", tab);

      // Use Next.js router with scroll=false to prevent scrolling
      router.replace(`?${searchParams.toString()}`, { scroll: false });

      // Force refresh to ensure new data is loaded
      refresh();
    }
  };

  // Handle pool type change
  const handlePoolTypeChange = (type: PoolTypeFilter) => {
    if (type !== poolType) {
      setPoolType(type);
      setPage(1);
      setAllPools([]);

      // Update URL with the new type
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("type", type);
      router.replace(`?${searchParams.toString()}`, { scroll: false });

      // Force refresh to ensure new data is loaded
      refresh();
    }
  };

  // Handle sort change
  const handleSortChange = (sort: PoolSortOption) => {
    if (sort !== sortBy) {
      setSortBy(sort);
      setPage(1);
      setAllPools([]);

      // Update URL with the new sort
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("sort", sort);
      router.replace(`?${searchParams.toString()}`, { scroll: false });

      // Force refresh to ensure new data is loaded
      refresh();
    }
  };

  const {
    pools,
    isLoading: loading,
    error,
    isDbError,
    refresh,
    hasMore,
    loadMore,
  } = usePoolsWithDeposits(page, activeTab, dbUser?.id, poolType, sortBy);

  // Track whether we're in initial loading state with no pools
  const [initialLoading, setInitialLoading] = useState(true);

  // Update initial loading state when data changes
  useEffect(() => {
    if (loading) {
      if (page === 1) {
        setInitialLoading(true);
      }
    } else {
      setInitialLoading(false);
    }
  }, [loading, page]);

  // Merge new pools with existing pools when pools or page changes
  useEffect(() => {
    if (pools && pools.length > 0) {
      // Only add unique pools (avoid duplicates)
      setAllPools((prevPools) => {
        // If we're on page 1, replace the pools instead of merging
        if (page === 1) {
          return [...pools];
        }

        const newPools = [...prevPools];
        pools.forEach((pool) => {
          if (!newPools.some((p) => p.id === pool.id)) {
            newPools.push(pool);
          }
        });
        return newPools;
      });
    } else if (!loading && page === 1) {
      // If we're not loading and on page 1 with no pools, ensure allPools is empty
      setAllPools([]);
    }
  }, [pools, page, loading]);

  // Function to load more pools
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow flex flex-col h-full">
        <PoolsListGrid
          pools={allPools}
          activeTab={activeTab}
          loading={initialLoading || (loading && page === 1)}
          error={error}
          isDbError={isDbError}
          refresh={refresh}
          onTabChange={(tabName: string) => {
            // Validate and convert tabName to TabType
            if (["open", "funded", "unfunded"].includes(tabName)) {
              handleTabChange(tabName as TabType);
            }
          }}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          poolType={poolType}
          onPoolTypeChange={handlePoolTypeChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Fixed Bottom Bar - Desktop Only - Ultra thin version */}
      <div className="hidden md:flex h-[2px] border-t border-gray-800/30 bg-[#1e1e2a] w-full"></div>
    </div>
  );
}
