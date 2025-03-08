"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaChevronDown } from "react-icons/fa";
import BottomNavbar from "../components/BottomNavbar";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getAllPools } from "../../lib/services/pool-service";
import { getPoolsByPatron } from "../../lib/services/patron-service";
import { Pool } from "../../lib/supabase";
import CircularProgress from "../components/CircularProgress";
import { usePoolsWithDeposits } from "../../hooks/usePoolsWithDeposits";

export default function PoolsPage() {
  const { logout } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("open");
  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const { pools, isLoading: loading, error } = usePoolsWithDeposits();

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
  let filteredPools =
    activeTab === "open"
      ? pools
      : pools.filter((pool) => joinedPoolIds.includes(pool.id));

  // Sort pools
  if (sortBy === "recent") {
    filteredPools = [...filteredPools].sort((a, b) => {
      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    });
  } else if (sortBy === "amount") {
    filteredPools = [...filteredPools].sort(
      (a, b) => b.raised_amount - a.raised_amount
    );
  } else if (sortBy === "alphabetical") {
    filteredPools = [...filteredPools].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  // Calculate percentage complete for each pool
  const getPercentComplete = (pool: Pool) => {
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
  const getPoolStatusIndicator = (pool: Pool) => {
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
      default:
        return "Recent";
    }
  };

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header with Create Button */}
      <header className="flex justify-between items-center p-4">
        <div></div> {/* Empty div for spacing */}
        <button
          onClick={() => router.push("/pools/create")}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaPlus className="text-white" />
        </button>
      </header>

      {/* PARTY ROUNDS Title */}
      <h1
        className="text-center text-5xl font-bold mt-2 mb-6"
        style={{ fontFamily: "'Impact', sans-serif" }}
      >
        PARTY ROUNDS
      </h1>

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
                <li
                  className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                    sortBy === "recent" ? "text-purple-400" : ""
                  }`}
                  onClick={() => handleSortSelect("recent")}
                >
                  Recent
                </li>
                <li
                  className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                    sortBy === "amount" ? "text-purple-400" : ""
                  }`}
                  onClick={() => handleSortSelect("amount")}
                >
                  Amount
                </li>
                <li
                  className={`px-4 py-2 hover:bg-[#352f54] cursor-pointer text-sm ${
                    sortBy === "alphabetical" ? "text-purple-400" : ""
                  }`}
                  onClick={() => handleSortSelect("alphabetical")}
                >
                  A-Z
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* List of Items */}
      <div
        className="flex-1 overflow-y-auto mt-4 px-4"
        style={{ paddingBottom: "70px" }}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading pools...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <p>Error loading pools. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredPools.map((pool) => (
              <li
                key={pool.id}
                className="p-4 bg-[#1C1B1F] rounded-xl cursor-pointer hover:bg-[#2A2640] transition-colors"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div className="flex items-center gap-3">
                  {/* Pool Image */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2A2640]">
                    {pool.image_url && (
                      <img
                        src={pool.image_url}
                        alt={pool.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Pool Info */}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-lg">{pool.name}</h3>
                      <div className="ml-2">{getPoolStatusIndicator(pool)}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2A2640]">
                        {pool.creator_avatar_url && (
                          <img
                            src={pool.creator_avatar_url}
                            alt={pool.creator_name}
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
            ))}

            {filteredPools.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                {activeTab === "open"
                  ? "No open rounds available."
                  : "You haven't joined any rounds yet."}
              </div>
            )}
          </ul>
        )}
      </div>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavbar activeTab="party" />
    </div>
  );
}
