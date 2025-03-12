"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaChevronDown, FaDollarSign } from "react-icons/fa";
import BottomNavbar from "../components/BottomNavbar";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getAllPools } from "../../lib/services/pool-service";
import { getPoolsByPatron } from "../../lib/services/patron-service";
import { Pool } from "../../lib/supabase";
import CircularProgress from "../components/CircularProgress";
import { usePoolsWithDeposits } from "../../hooks/usePoolsWithDeposits";
import Image from "next/image";
import GetTokensModal from "../components/GetTokensModal";
import AppHeader from "../components/AppHeader";

type TabType = "open" | "my" | "trading";

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
  blockchain_status: string;
};

export default function PoolsPage() {
  const { logout } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState<TabType>("open");
  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const {
    pools,
    isLoading: loading,
    error,
    isRpcError,
    refresh,
    isUsingCache,
  } = usePoolsWithDeposits();
  const [showUSDCModal, setShowUSDCModal] = useState(false);

  // Set the correct viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle clicks outside the sort dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
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

  // Filter pools based on active tab
  const filteredPools =
    pools?.filter((pool: OnChainPool) => {
      const endDate = new Date(pool.ends_at);
      const now = new Date();
      const isEnded = endDate < now;

      if (activeTab === "trading") {
        return isEnded;
      } else if (activeTab === "my") {
        return !isEnded && pool.creator_id === dbUser?.id;
      } else {
        // open
        return !isEnded;
      }
    }) || [];

  // Sort pools
  const sortedPools = [...filteredPools];

  if (sortBy === "recent") {
    sortedPools.sort((a: OnChainPool, b: OnChainPool) => {
      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
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

  // Format amount for display
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  // Get pool status indicator
  const getPoolStatusIndicator = (pool: OnChainPool) => {
    if (pool.status === "closed") {
      return <span className="text-gray-400">• Closed</span>;
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

  return (
    <div
      className="flex flex-col bg-[#15161a] text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Use the new AppHeader component with title */}
      <AppHeader
        showCreateButton={true}
        showGetTokensButton={true}
        onGetTokensClick={() => setShowUSDCModal(true)}
        backgroundColor="#15161a"
        showTitle={true}
      />

      {/* Get Tokens Modal */}
      <GetTokensModal
        isOpen={showUSDCModal}
        onClose={() => setShowUSDCModal(false)}
      />

      {/* Tabs */}
      <div className="flex justify-center gap-2 px-4">
        <button
          className={`px-6 py-3 rounded-full text-lg ${
            activeTab === "open"
              ? "bg-white text-black font-medium"
              : "bg-transparent text-white border border-gray-700"
          }`}
          onClick={() => setActiveTab("open")}
        >
          Open rounds
        </button>
        <button
          className={`px-6 py-3 rounded-full text-lg ${
            activeTab === "my"
              ? "bg-white text-black font-medium"
              : "bg-transparent text-white border border-gray-700"
          }`}
          onClick={() => setActiveTab("my")}
        >
          My rounds
        </button>
        <button
          className={`px-6 py-3 rounded-full text-lg ${
            activeTab === "trading"
              ? "bg-white text-black font-medium"
              : "bg-transparent text-white border border-gray-700"
          }`}
          onClick={() => setActiveTab("trading")}
        >
          Trading
        </button>
      </div>

      {/* Filters */}
      <div className="flex justify-end items-center mt-6 px-4 w-full">
        <div className="relative ml-auto" ref={sortDropdownRef}>
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
                {activeTab !== "trading" ? (
                  <>
                    <li
                      className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                        sortBy === "recent" ? "" : ""
                      }`}
                      style={{ color: sortBy === "recent" ? "#836EF9" : "" }}
                      onClick={() => handleSortSelect("recent")}
                    >
                      Recent
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                        sortBy === "amount" ? "" : ""
                      }`}
                      style={{ color: sortBy === "amount" ? "#836EF9" : "" }}
                      onClick={() => handleSortSelect("amount")}
                    >
                      Amount
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                        sortBy === "alphabetical" ? "" : ""
                      }`}
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
                      className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                        sortBy === "volume" ? "" : ""
                      }`}
                      style={{ color: sortBy === "volume" ? "#836EF9" : "" }}
                      onClick={() => handleSortSelect("volume")}
                    >
                      Volume
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                        sortBy === "alphabetical" ? "" : ""
                      }`}
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

      {/* Cache indicator */}
      {isUsingCache && (
        <div className="px-4 py-2 bg-amber-800 bg-opacity-30 text-amber-300 text-sm text-center">
          Showing cached data.
          <button
            onClick={() => refresh()}
            className="ml-2 underline hover:text-amber-200"
          >
            Refresh
          </button>
        </div>
      )}

      {/* List of Items */}
      <div
        className="flex-1 overflow-y-auto mt-4 px-4"
        style={{ paddingBottom: "128px" }}
      >
        {loading && pools.length === 0 ? (
          // Show skeleton loading UI when loading and no cached data
          renderSkeletonList()
        ) : error && !isRpcError ? (
          // Show error state for non-RPC errors
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
            {activeTab !== "trading"
              ? // Open Rounds and My Rounds UI
                sortedPools.map((pool: OnChainPool) => (
                  <li
                    key={pool.id}
                    className="p-4 bg-[#FFFFFF0A] rounded-xl cursor-pointer hover:bg-[#2A2640] transition-colors"
                    onClick={() => router.push(`/pools/${pool.id}`)}
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
                          <div className="ml-2">
                            {getPoolStatusIndicator(pool)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2A2640]">
                            {pool.creator_avatar_url && (
                              <Image
                                src={pool.creator_avatar_url || ""}
                                alt={pool.creator_name || ""}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <span className="text-sm text-gray-400">
                            {pool.creator_name || "Anonymous"}
                          </span>
                        </div>
                      </div>

                      {/* Progress and Amount */}
                      <div className="text-right flex items-center gap-4">
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
                      </div>
                    </div>
                  </li>
                ))
              : // Trading Pools UI - based on the image
                sortedPools.map((pool: OnChainPool) => (
                  <li
                    key={pool.id}
                    className="p-4 bg-[#FFFFFF0A] rounded-xl cursor-pointer hover:bg-[#2A2640] transition-colors"
                    onClick={() => router.push(`/pools/${pool.id}`)}
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
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2A2640]">
                            {pool.creator_avatar_url && (
                              <Image
                                src={pool.creator_avatar_url || ""}
                                alt={pool.creator_name || ""}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <span className="text-sm text-gray-400">
                            {pool.creator_name || "Anonymous"}
                          </span>
                        </div>
                      </div>

                      {/* Volume Display */}
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Vol</p>
                        <p className="text-lg font-bold">
                          ${formatAmount(pool.raised_amount)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}

            {sortedPools.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-400">
                {activeTab === "open"
                  ? "No open rounds available."
                  : activeTab === "my"
                  ? "You haven't created any rounds yet."
                  : "No trading pools available."}
              </div>
            )}
          </ul>
        )}
      </div>

      <BottomNavbar activeTab="party" />
    </div>
  );
}
