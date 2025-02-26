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

export default function PoolsPage() {
  const { logout } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("open");
  const [pools, setPools] = useState<Pool[]>([]);
  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Set the correct viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch pools data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all pools
        const allPools = await getAllPools();
        setPools(allPools);

        // If user is logged in, fetch joined pools
        if (dbUser) {
          const userPoolIds = await getPoolsByPatron(dbUser.id);
          setJoinedPoolIds(userPoolIds);
        }
      } catch (error) {
        console.error("Error fetching pools:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        className="flex-1 overflow-y-auto mt-4"
        style={{ paddingBottom: "70px" }}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading pools...</div>
        ) : (
          <ul>
            {filteredPools.map((pool) => (
              <li
                key={pool.id}
                className="p-4 border-b border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-900"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div>
                  <div className="font-medium">{pool.name}</div>
                  <div className="text-sm text-gray-400">
                    {pool.creator_name || "Anonymous"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{getPercentComplete(pool)}%</div>
                  <div className="text-sm text-gray-400">
                    ${formatAmount(pool.target_amount)}
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
