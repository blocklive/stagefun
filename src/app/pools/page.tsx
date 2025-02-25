"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "../components/BottomNavbar";

export default function PoolsPage() {
  const { logout } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");

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

        {/* Empty div to maintain flex spacing */}
        <div></div>
      </header>

      {/* Header Title */}
      <h1 className="text-center text-xl mt-4">PARTY ROUNDS</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mt-4">
        <button className="bg-gray-800 px-4 py-2 rounded-full">
          Open rounds
        </button>
        <button className="bg-gray-800 px-4 py-2 rounded-full">
          My rounds
        </button>
      </div>

      {/* List of Items - Add padding bottom to prevent content from being hidden behind navbar */}
      <div
        className="flex-1 overflow-y-auto mt-4"
        style={{ paddingBottom: "70px" }}
      >
        <ul>
          <li className="p-4 border-b border-gray-700">
            1X Technologies - Matt Hill
          </li>
          <li className="p-4 border-b border-gray-700">
            LILIES - Mia Anderson
          </li>
          <li className="p-4 border-b border-gray-700">
            kotopia - Lucas Wilson
          </li>
          {/* Add more items to test scrolling */}
          <li className="p-4 border-b border-gray-700">
            Quantum Labs - Sarah Johnson
          </li>
          <li className="p-4 border-b border-gray-700">
            Nexus Protocol - James Chen
          </li>
          <li className="p-4 border-b border-gray-700">
            Zenith Network - Alex Rodriguez
          </li>
        </ul>
      </div>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavbar activeTab="party" />
    </div>
  );
}
