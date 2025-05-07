"use client";

import React from "react";

export default function NFTSkeleton() {
  const skeletonNFTs = Array(4).fill(null);

  return (
    <div className="space-y-2 mt-6">
      {skeletonNFTs.map((_, index) => (
        <div
          key={index}
          className="bg-[#1E1F23] rounded-xl overflow-hidden flex flex-row items-center mb-3"
        >
          {/* NFT Image Skeleton */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 m-3">
            <div className="w-full h-full bg-gray-700 animate-pulse"></div>
          </div>

          {/* NFT Details Skeleton */}
          <div className="p-4 flex-1">
            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-24 bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* External Link Button Skeleton */}
          <div className="relative mr-4">
            <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
