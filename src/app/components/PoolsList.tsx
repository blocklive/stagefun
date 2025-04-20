"use client";

import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import CircularProgress from "./CircularProgress";
import Image from "next/image";
import UserAvatar from "./UserAvatar";
import { formatAmount } from "../../lib/utils";
import { useRouter } from "next/navigation";
import {
  TabType,
  PoolTypeFilter,
} from "../../hooks/usePoolsWithDepositsHomePage";

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

interface PoolsListProps {
  pools: OnChainPool[];
  dbUser: any;
  loading: boolean;
  error: boolean;
  isDbError: boolean;
  refresh: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  poolType: PoolTypeFilter;
  onPoolTypeChange: (poolType: PoolTypeFilter) => void;
}

export default function PoolsList({
  pools,
  dbUser,
  loading,
  error,
  isDbError,
  refresh,
  activeTab,
  onTabChange,
  poolType,
  onPoolTypeChange,
}: PoolsListProps) {
  const router = useRouter();

  const [sortBy, setSortBy] = useState("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

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

  // Sort pools
  const sortedPools = [...pools];

  if (sortBy === "recent") {
    sortedPools.sort((a: OnChainPool, b: OnChainPool) => {
      const dateA = new Date(a.created_at || "").getTime();
      const dateB = new Date(b.created_at || "").getTime();
      return dateB - dateA;
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
  const handleTypeSelect = (typeOption: PoolTypeFilter) => {
    onPoolTypeChange(typeOption);
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
        <div className="w-12 h-12 rounded-full bg-gray-700"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700"></div>
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
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

  const renderSkeletonList = () => (
    <ul className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index}>{renderSkeletonItem()}</div>
      ))}
    </ul>
  );

  // Handle pool click
  const handlePoolClick = (poolId: string) => {
    router.push(`/pools/${poolId}?from_tab=${activeTab}`, { scroll: false });
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex justify-center md:justify-start gap-2 px-4">
        <button
          className={`w-[110px] py-3 rounded-full text-lg ${
            activeTab === "open"
              ? "bg-white text-black font-medium"
              : "bg-transparent text-white border border-gray-700"
          }`}
          onClick={() => onTabChange("open")}
        >
          Open
        </button>
        <button
          className={`w-[110px] py-3 rounded-full text-lg ${
            activeTab === "funded"
              ? "bg-white text-black font-medium"
              : "bg-transparent text-white border border-gray-700"
          }`}
          onClick={() => onTabChange("funded")}
        >
          Funded
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
                {activeTab !== "funded" ? (
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
        {loading ? (
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
    </>
  );
}
