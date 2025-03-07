"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus } from "react-icons/fa";
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
    activeTab === "open"
      ? pools
      : pools.filter((pool) => joinedPoolIds.includes(pool.id));

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

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-700">
        {/* App Logo */}
        <div className="w-10 h-10 bg-purple-500 rounded-lg rotate-45 flex items-center justify-center">
          <div className="w-7 h-7 bg-black rounded-md -rotate-45"></div>
        </div>

        {/* Create Pool Button */}
        <button
          onClick={() => router.push("/pools/create")}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaPlus className="text-white" />
        </button>
      </header>

      {/* Header Title */}
      <h1 className="text-center text-xl mt-4">PARTY ROUNDS</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === "open" ? "bg-purple-500" : "bg-gray-800"
          }`}
          onClick={() => setActiveTab("open")}
        >
          Open rounds
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === "my" ? "bg-purple-500" : "bg-gray-800"
          }`}
          onClick={() => setActiveTab("my")}
        >
          My rounds
        </button>
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
                    <h3 className="font-semibold text-lg">{pool.name}</h3>
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
