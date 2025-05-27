"use client";

import React, { useState } from "react";
import AssetsSkeleton from "./AssetsSkeleton";
import PoolListSkeleton from "./PoolListSkeleton";
import NFTSkeleton from "./NFTSkeleton";

// Define the tab types for proper typing
type TabType = "assets" | "nfts" | "passes" | "hosted" | "funded";

export default function ProfileSkeleton() {
  // Use useState to properly handle the active tab type
  const [activeTab] = useState<TabType>("assets");

  return (
    <div className="px-4 pb-24 md:pb-8">
      {/* Profile Header Skeleton */}
      <div className="relative py-6 px-4 bg-gradient-to-b from-[#1A0B3E] to-[#4A2A9A] rounded-xl">
        <div className="container mx-auto">
          {/* Top Row: Avatar, User Info and Balance */}
          <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6">
            {/* Profile Avatar Skeleton */}
            <div className="relative">
              <div className="w-24 h-24 md:w-20 md:h-20 rounded-full bg-gray-700 animate-pulse"></div>
            </div>

            {/* User Info Skeleton */}
            <div className="flex flex-col items-center md:items-start flex-grow">
              <div className="h-8 w-40 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mt-2"></div>
            </div>

            {/* Balance Skeleton */}
            <div className="flex flex-col items-center md:items-end mt-4 md:mt-0">
              <div className="h-5 w-20 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-8 w-28 bg-gray-700 rounded animate-pulse"></div>

              {/* Action Buttons Skeleton */}
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse mb-1"></div>
                  <div className="h-3 w-12 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse mb-1"></div>
                  <div className="h-3 w-16 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mt-4">
        <div className="flex border-b border-gray-800">
          {[
            { id: "assets", label: "Tokens" },
            { id: "nfts", label: "NFTs" },
            { id: "passes", label: "Passes" },
            { id: "hosted", label: "Hosted" },
            { id: "funded", label: "Committed" },
          ].map((tab, idx) => (
            <div key={idx} className="py-2 px-4">
              <div
                className={`h-6 w-20 rounded animate-pulse ${
                  tab.id === activeTab ? "bg-[#836EF9]" : "bg-gray-700"
                }`}
              ></div>
            </div>
          ))}
        </div>

        {/* Tab Content Skeleton */}
        <div className="mt-6 pb-32">
          {activeTab === "assets" && <AssetsSkeleton />}
          {activeTab === "nfts" && <NFTSkeleton />}
          {activeTab === "passes" && <NFTSkeleton />}
          {activeTab === "hosted" && <PoolListSkeleton />}
          {activeTab === "funded" && <PoolListSkeleton />}
        </div>
      </div>
    </div>
  );
}
