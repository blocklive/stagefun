"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getPoolsByPatron } from "../../lib/services/patron-service";
import { usePoolsWithDeposits } from "../../hooks/usePoolsWithDeposits";
import { useFeaturedPools } from "../../hooks/useFeaturedPools";
import FeaturedRoundsCarousel from "./FeaturedRoundsCarousel";
import PoolsList from "./PoolsList";

type TabType = "open" | "funded" | "unfunded";

// Define a type for the pools returned by usePoolsWithDeposits
type OnChainPool = {
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

export default function HomePage() {
  const { dbUser } = useSupabase();
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
    setActiveTab(tab);
    // Update URL without adding to history
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [poolType, setPoolType] = useState("all"); // "all" or "my"
  const {
    pools,
    isLoading: loading,
    error,
    isDbError,
    refresh,
    isUsingCache,
  } = usePoolsWithDeposits(1, activeTab);
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

  // Replace the custom filtering section with a simpler version
  // that only filters by pool type (all or my)
  const filteredPools =
    pools?.filter((pool) => {
      // Only filter by pool type (all or my)
      if (poolType === "my" && pool.creator_id !== dbUser?.id) {
        return false;
      }

      return true;
    }) || [];

  // Sort pools
  const sortedPools = [...filteredPools];

  if (sortBy === "recent") {
    sortedPools.sort((a: OnChainPool, b: OnChainPool) => {
      // Use the created_at field from Supabase for accurate sorting
      const dateA = new Date(a.created_at || "").getTime();
      const dateB = new Date(b.created_at || "").getTime();
      return dateB - dateA; // Sort in descending order (newest first)
    });
  } else if (sortBy === "amount") {
    sortedPools.sort(
      (a: OnChainPool, b: OnChainPool) => b.raised_amount - a.raised_amount
    );
  } else if (sortBy === "alphabetical") {
    sortedPools.sort((a: OnChainPool, b: OnChainPool) =>
      a.name.localeCompare(b.name)
    );
  } else if (sortBy === "volume") {
    sortedPools.sort(
      (a: OnChainPool, b: OnChainPool) => b.raised_amount - a.raised_amount
    );
  }

  return (
    <div className="px-4 pb-24 md:pb-8">
      {/* Featured Rounds Carousel */}
      <FeaturedRoundsCarousel pools={featuredPools} />

      {/* Daily Check-in */}
      <div className="mb-6">{/* Daily Check-in component removed */}</div>

      {/* Pools List, Filter, and Sort */}
      <PoolsList
        pools={pools}
        dbUser={dbUser}
        loading={loading}
        error={error}
        isDbError={isDbError}
        refresh={refresh}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
