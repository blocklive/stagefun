"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaChevronDown, FaDollarSign } from "react-icons/fa";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getAllPools } from "../../lib/services/pool-service";
import { getPoolsByPatron } from "../../lib/services/patron-service";
import { Pool } from "../../lib/supabase";
import CircularProgress from "../components/CircularProgress";
import { usePoolsWithDeposits } from "../../hooks/usePoolsWithDeposits";
import { useFeaturedPools } from "../../hooks/useFeaturedPools";
import Image from "next/image";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";
import AppHeader from "../components/AppHeader";
import {
  PoolStatus,
  getPoolStatusFromNumber,
  getDisplayStatus,
} from "../../lib/contracts/types";
import UserAvatar from "../components/UserAvatar";
import { USDC_DECIMAL_FACTOR } from "../../lib/contracts/StageDotFunPool";
import { formatAmount } from "../../lib/utils";
import FeaturedRoundsCarousel from "../components/FeaturedRoundsCarousel";

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

export default function PoolsPage() {
  const { logout, authenticated } = usePrivy();
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
  const [showUSDCModal, setShowUSDCModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  // Calculate percentage complete for each pool
  const getPercentComplete = (pool: OnChainPool) => {
    if (!pool.target_amount) return 0;
    return Math.min(
      100,
      Math.round((pool.raised_amount / pool.target_amount) * 100)
    );
  };

  // Get pool status indicator
  const getPoolStatusIndicator = (pool: OnChainPool) => {
    // Display indicator based on status string from database
    if (pool.status === "CLOSED" || pool.status === "CANCELLED") {
      return (
        <span className="text-gray-400">
          • {pool.status.charAt(0) + pool.status.slice(1).toLowerCase()}
        </span>
      );
    }

    if (pool.status === "PAUSED") {
      return <span className="text-yellow-400">• Paused</span>;
    }

    return null;
  };

  // Handle sort selection
  const handleSortSelect = (sortOption: string) => {
    setSortBy(sortOption);
    setShowSortDropdown(false);
  };

  // Get sort by display text
  const getSortByText = () => {
    switch (sortBy) {
      case "recent":
        return "Recent";
      case "amount":
        return "Amount";
      case "alphabetical":
        return "A-Z";
      case "volume":
        return "Volume";
      default:
        return "Recent";
    }
  };

  // Handle type selection
  const handleTypeSelect = (typeOption: string) => {
    setPoolType(typeOption);
    setShowTypeDropdown(false);
  };

  // Get type display text
  const getTypeText = () => {
    return poolType === "all" ? "All types" : "My pools";
  };

  // Render skeleton loading UI for pools
  const renderSkeletonItem = () => (
    <li className="p-4 bg-[#FFFFFF0A] rounded-xl animate-pulse">
      <div className="flex items-center gap-3">
        {/* Pool Image Skeleton */}
        <div className="w-12 h-12 rounded-full bg-gray-700"></div>

        {/* Pool Info Skeleton */}
        <div className="flex-1">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700"></div>
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>

        {/* Progress and Amount Skeleton */}
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="h-5 bg-gray-700 rounded w-16 mb-1"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-700"></div>
        </div>
      </div>
    </li>
  );

  // Render skeleton loading UI
  const renderSkeletonList = () => (
    <ul className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index}>{renderSkeletonItem()}</div>
      ))}
    </ul>
  );

  // Update the pool click handler
  const handlePoolClick = (poolId: string) => {
    router.push(`/pools/${poolId}?from_tab=${activeTab}`);
  };

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  return (
    <div
      className="bg-[#15161A] min-h-screen text-white pb-6"
      style={{ minHeight: viewportHeight }}
    >
      {/* Main Content */}
      <div className="px-4 pb-24 md:pb-8">
        {/* Featured Rounds Carousel */}
        {featuredPools && featuredPools.length > 0 && (
          <FeaturedRoundsCarousel pools={featuredPools} />
        )}

        {/* Daily Check-in */}
        <div className="mb-6">{/* Daily Check-in component removed */}</div>

        {/* Tabs */}
        <div className="flex justify-center md:justify-start gap-2 px-4">
          <button
            className={`w-[110px] py-3 rounded-full text-lg ${
              activeTab === "open"
                ? "bg-white text-black font-medium"
                : "bg-transparent text-white border border-gray-700"
            }`}
            onClick={() => handleTabChange("open")}
          >
            Open
          </button>
          <button
            className={`w-[110px] py-3 rounded-full text-lg ${
              activeTab === "funded"
                ? "bg-white text-black font-medium"
                : "bg-transparent text-white border border-gray-700"
            }`}
            onClick={() => handleTabChange("funded")}
          >
            Funded
          </button>
          <button
            className={`w-[110px] py-3 rounded-full text-lg ${
              activeTab === "unfunded"
                ? "bg-white text-black font-medium"
                : "bg-transparent text-white border border-gray-700"
            }`}
            onClick={() => handleTabChange("unfunded")}
          >
            Unfunded
          </button>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mt-6 px-4 w-full">
          {/* Type Dropdown */}
          <div className="relative" ref={typeDropdownRef}>
            <button
              className="flex items-center gap-2 text-white bg-transparent py-2 text-sm"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              {getTypeText()} <FaChevronDown className="text-xs ml-1" />
            </button>

            {showTypeDropdown && (
              <div className="absolute left-0 mt-2 w-40 bg-[#2A2640] rounded-lg shadow-lg z-10">
                <ul>
                  <li
                    className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                    style={{ color: poolType === "all" ? "#836EF9" : "" }}
                    onClick={() => handleTypeSelect("all")}
                  >
                    All types
                  </li>
                  <li
                    className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                    style={{ color: poolType === "my" ? "#836EF9" : "" }}
                    onClick={() => handleTypeSelect("my")}
                  >
                    My pools
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              className="flex items-center gap-2 text-white bg-transparent py-2 text-sm"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
            >
              Sort by: {getSortByText()}{" "}
              <FaChevronDown className="text-xs ml-1" />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-[#2A2640] rounded-lg shadow-lg z-10">
                <ul>
                  {activeTab !== "funded" && activeTab !== "unfunded" ? (
                    <>
                      <li
                        className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                        style={{
                          color: sortBy === "recent" ? "#836EF9" : "",
                        }}
                        onClick={() => handleSortSelect("recent")}
                      >
                        Recent
                      </li>
                      <li
                        className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                        style={{
                          color: sortBy === "amount" ? "#836EF9" : "",
                        }}
                        onClick={() => handleSortSelect("amount")}
                      >
                        Amount
                      </li>
                      <li
                        className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                        style={{
                          color: sortBy === "alphabetical" ? "#836EF9" : "",
                        }}
                        onClick={() => handleSortSelect("alphabetical")}
                      >
                        A-Z
                      </li>
                    </>
                  ) : (
                    <>
                      <li
                        className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                        style={{
                          color: sortBy === "volume" ? "#836EF9" : "",
                        }}
                        onClick={() => handleSortSelect("volume")}
                      >
                        Volume
                      </li>
                      <li
                        className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm`}
                        style={{
                          color: sortBy === "alphabetical" ? "#836EF9" : "",
                        }}
                        onClick={() => handleSortSelect("alphabetical")}
                      >
                        A-Z
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* List of Items */}
        <div
          className="flex-1 overflow-y-auto mt-4 px-4"
          style={{ paddingBottom: "128px" }}
        >
          {loading && pools.length === 0 ? (
            renderSkeletonList()
          ) : error && !isDbError ? (
            <div className="p-8 text-center text-red-400">
              <p>Error loading pools. Please try again later.</p>
              <button
                onClick={() => refresh()}
                className="mt-4 px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors"
                style={{ backgroundColor: "#836EF9" }}
              >
                Refresh
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {sortedPools.map((pool: OnChainPool) => (
                <li
                  key={pool.id}
                  className="p-4 bg-[#FFFFFF0A] rounded-xl cursor-pointer hover:bg-[#2A2640] transition-colors"
                  onClick={() => handlePoolClick(pool.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Pool Image */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2A2640]">
                      {pool.image_url && (
                        <Image
                          src={pool.image_url}
                          alt={pool.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Pool Info */}
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-lg">{pool.name}</h3>
                        {activeTab !== "funded" && (
                          <div className="ml-2">
                            {getPoolStatusIndicator(pool)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar
                          avatarUrl={pool.creator_avatar_url || undefined}
                          name={pool.creator_name || undefined}
                          size={24}
                        />
                        <span className="text-sm text-gray-400">
                          {pool.creator_name || "Anonymous"}
                        </span>
                      </div>
                    </div>

                    {/* Progress and Amount */}
                    <div className="text-right flex items-center gap-4">
                      {activeTab === "funded" ? (
                        <div>
                          <p className="text-sm text-gray-400">Vol</p>
                          <p className="text-lg font-bold">
                            ${formatAmount(pool.raised_amount)}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="font-medium">
                              ${formatAmount(pool.raised_amount)}
                            </div>
                            <div className="text-sm text-gray-400">
                              of ${formatAmount(pool.target_amount)}
                            </div>
                          </div>
                          <CircularProgress
                            progress={getPercentComplete(pool)}
                            size={48}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}

              {sortedPools.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-400">
                  {activeTab === "open"
                    ? poolType === "my"
                      ? "You haven't created any open rounds yet."
                      : "No open rounds available."
                    : activeTab === "funded"
                    ? poolType === "my"
                      ? "You haven't created any funded pools yet."
                      : "No funded pools available."
                    : poolType === "my"
                    ? "You haven't created any unfunded pools yet."
                    : "No unfunded pools available."}
                </div>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
