"use client";

import React from "react";

export default function PoolListSkeleton() {
  // Create an array of placeholder pool rows
  const skeletonPools = Array(4).fill(null);

  return (
    <div className="space-y-4 mt-6">
      {skeletonPools.map((_, index) => (
        <div
          key={index}
          className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Pool Image Skeleton */}
            <div className="h-16 w-16 md:h-20 md:w-20 bg-gray-700 rounded-lg animate-pulse"></div>

            {/* Pool Details Skeleton */}
            <div className="flex-1">
              {/* Pool Title Skeleton */}
              <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-2"></div>

              {/* Pool Status Skeleton */}
              <div className="flex items-center mb-2">
                <div className="h-4 w-4 bg-gray-700 rounded-full animate-pulse mr-2"></div>
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
              </div>

              {/* Pool Info Skeleton */}
              <div className="flex items-center space-x-4">
                <div className="h-4 w-28 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Action Button Skeleton */}
            <div className="md:self-center">
              <div className="h-9 w-24 bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
