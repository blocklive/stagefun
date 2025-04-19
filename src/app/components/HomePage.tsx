"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getPoolsByPatron } from "../../lib/services/patron-service";
import { useFeaturedPools } from "../../hooks/useFeaturedPools";
import {
  usePoolsWithDepositsHomePage,
  TabType,
  PoolTypeFilter,
} from "../../hooks/usePoolsWithDepositsHomePage";
import FeaturedRoundsCarousel from "./FeaturedRoundsCarousel";
import PoolsList from "./PoolsList";

// Define the maximum number of items to show per tab
const MAX_ITEMS_PER_TAB = 15;

export default function HomePage() {
  const { dbUser } = useSupabase();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState<TabType>("open");
  const [poolType, setPoolType] = useState<PoolTypeFilter>("all");

  // Use our custom hook
  const {
    pools: allPools,
    isLoading,
    error,
    isDbError,
    refresh,
    fetchPoolsForTab,
  } = usePoolsWithDepositsHomePage(
    "open",
    MAX_ITEMS_PER_TAB,
    dbUser?.id,
    "all"
  );

  // Update active tab when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabType;
      if (tab && ["open", "funded"].includes(tab)) {
        setActiveTab(tab);
        fetchPoolsForTab(tab, poolType);
      }
    };

    // Set initial state
    handleUrlChange();

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [fetchPoolsForTab, poolType]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    // Only handle open and funded tabs
    if (tab === "open" || tab === "funded") {
      setActiveTab(tab);
      fetchPoolsForTab(tab, poolType);

      // Update URL without adding to history and prevent scrolling
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(`${window.location.pathname}?tab=${tab}`, {
        scroll: false,
      });
    }
  };

  // Handle pool type change
  const handlePoolTypeChange = (newPoolType: PoolTypeFilter) => {
    setPoolType(newPoolType);
    fetchPoolsForTab(activeTab, newPoolType);
  };

  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const { featuredPools, isLoading: featuredLoading } = useFeaturedPools();

  // Set the correct viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle clicks outside the dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch joined pools when user changes
  useEffect(() => {
    const fetchJoinedPools = async () => {
      if (dbUser) {
        const userPoolIds = await getPoolsByPatron(dbUser.id);
        setJoinedPoolIds(userPoolIds);
      }
    };

    fetchJoinedPools();
  }, [dbUser]);

  // Sort pools
  const sortedPools = [...allPools];

  if (sortBy === "recent") {
    sortedPools.sort((a, b) => {
      // Use the created_at field from Supabase for accurate sorting
      const dateA = new Date(a.created_at || "").getTime();
      const dateB = new Date(b.created_at || "").getTime();
      return dateB - dateA; // Sort in descending order (newest first)
    });
  } else if (sortBy === "amount") {
    sortedPools.sort((a, b) => b.raised_amount - a.raised_amount);
  } else if (sortBy === "alphabetical") {
    sortedPools.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "volume") {
    sortedPools.sort((a, b) => b.raised_amount - a.raised_amount);
  }

  return (
    <div className="px-4 pb-24 md:pb-8">
      {/* Featured Rounds Carousel */}
      <FeaturedRoundsCarousel pools={featuredPools} />

      {/* Daily Check-in */}
      <div className="mb-6">{/* Daily Check-in component removed */}</div>

      {/* Pools List, Filter, and Sort */}
      <PoolsList
        pools={sortedPools}
        dbUser={dbUser}
        loading={isLoading}
        error={error}
        isDbError={isDbError}
        refresh={refresh}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        poolType={poolType}
        onPoolTypeChange={handlePoolTypeChange}
      />
    </div>
  );
}
