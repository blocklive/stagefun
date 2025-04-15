"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../contexts/SupabaseContext";
import { usePoolsWithDeposits } from "../../hooks/usePoolsWithDeposits";
import { useFeaturedPools } from "../../hooks/useFeaturedPools";
import FeaturedRoundsCarousel from "./FeaturedRoundsCarousel";
import PoolsListGrid from "./pools/PoolsListGrid";

type TabType = "open" | "funded" | "unfunded";

export default function PoolsListPage() {
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState<TabType>("open");

  // Update active tab when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabType;
      if (tab && ["open", "funded", "unfunded"].includes(tab)) {
        setActiveTab(tab);
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
      setActiveTab(tab);

      // Update URL without scrolling to top
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("tab", tab);

      // Use Next.js router with scroll=false to prevent scrolling
      router.replace(`?${searchParams.toString()}`, { scroll: false });
    }
  };

  const {
    pools,
    isLoading: loading,
    error,
    isDbError,
    refresh,
  } = usePoolsWithDeposits(1, activeTab);
  const { featuredPools } = useFeaturedPools();

  // Set the correct viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  return (
    <div className="px-4 pb-24 md:pb-8">
      {/* Daily Check-in */}
      <div className="mb-6">{/* Daily Check-in component removed */}</div>

      {/* Pools List Grid Component */}
      <PoolsListGrid
        pools={pools}
        activeTab={activeTab}
        loading={loading}
        error={error}
        isDbError={isDbError}
        refresh={refresh}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
