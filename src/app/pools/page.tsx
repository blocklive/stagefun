"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import BottomNavbar from "../components/BottomNavbar";

export default function PoolsPage() {
  const { logout } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("open"); // "open" or "my"

  // Mock pool data
  const pools = [
    {
      id: "1x-tech",
      name: "1X Technologies",
      creator: "Matt Hill",
      percentComplete: 64,
      amount: "1.5M",
      isJoined: false,
    },
    {
      id: "lilies",
      name: "LILIES",
      creator: "Mia Anderson",
      percentComplete: 32,
      amount: "500K",
      isJoined: true,
    },
    {
      id: "kotopia",
      name: "kotopia",
      creator: "Lucas Wilson",
      percentComplete: 78,
      amount: "250K",
      isJoined: false,
    },
    {
      id: "quantum-labs",
      name: "Quantum Labs",
      creator: "Sarah Johnson",
      percentComplete: 45,
      amount: "800K",
      isJoined: true,
    },
    {
      id: "nexus-protocol",
      name: "Nexus Protocol",
      creator: "James Chen",
      percentComplete: 92,
      amount: "1.2M",
      isJoined: false,
    },
    {
      id: "zenith-network",
      name: "Zenith Network",
      creator: "Alex Rodriguez",
      percentComplete: 12,
      amount: "300K",
      isJoined: true,
    },
  ];

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      // Use the window's inner height for a more accurate measurement
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Filter pools based on active tab
  const filteredPools =
    activeTab === "open" ? pools : pools.filter((pool) => pool.isJoined);

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-700">
        {/* App Logo - Same as login page */}
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

      {/* List of Items - Add padding bottom to prevent content from being hidden behind navbar */}
      <div
        className="flex-1 overflow-y-auto mt-4"
        style={{ paddingBottom: "70px" }}
      >
        <ul>
          {filteredPools.map((pool) => (
            <li
              key={pool.id}
              className="p-4 border-b border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-900"
              onClick={() => router.push(`/pools/${pool.id}`)}
            >
              <div>
                <div className="font-medium">{pool.name}</div>
                <div className="text-sm text-gray-400">{pool.creator}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{pool.percentComplete}%</div>
                <div className="text-sm text-gray-400">${pool.amount}</div>
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
      </div>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavbar activeTab="party" />
    </div>
  );
}
