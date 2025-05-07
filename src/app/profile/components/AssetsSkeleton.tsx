"use client";

import React from "react";

export default function AssetsSkeleton() {
  // Create an array of placeholder asset rows
  const skeletonAssets = Array(5).fill(null);

  return (
    <div className="space-y-4 mt-6">
      {/* Assets List Skeleton */}
      <div className="space-y-4">
        {skeletonAssets.map((_, index) => (
          <div
            key={index}
            className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
          >
            <div className="flex items-center">
              {/* Token Icon Skeleton */}
              <div className="h-12 w-12 bg-gray-700 rounded-full animate-pulse"></div>

              <div className="ml-4 flex-1">
                {/* Token Name Skeleton */}
                <div className="h-5 w-24 bg-gray-700 rounded animate-pulse mb-2"></div>
                {/* Token Balance Skeleton */}
                <div className="h-4 w-36 bg-gray-700 rounded animate-pulse"></div>
              </div>

              {/* Send Button Skeleton */}
              <div className="h-9 w-16 bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
