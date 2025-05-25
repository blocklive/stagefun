"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MyPoints = () => {
  const { points, isLoading } = usePoints();

  const formatPoints = (value: number | null): string => {
    if (value === null) return "...";
    return value.toLocaleString();
  };

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base">My Points</h3>
          <div className="text-sm text-gray-500">Total points earned</div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color="#FFDD50" size={20} />
          ) : (
            <div className="text-2xl font-bold text-[#FFDD50]">
              {formatPoints(points)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPoints;
