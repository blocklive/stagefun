"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { FaBolt, FaFire } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const DailyCheckin = () => {
  const {
    points,
    isLoading,
    streakCount,
    canClaim,
    formattedTimeRemaining,
    claimDailyPoints,
  } = usePoints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg shadow-md border border-gray-800">
        <LoadingSpinner color="#836EF9" size={20} />
        <span className="ml-2 text-gray-300">Loading points...</span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg shadow-md border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-1">
          <FaBolt className="text-yellow-400" />
          <span className="font-semibold text-white">
            {points?.toLocaleString() || 0} pts
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <FaFire className="text-orange-500" />
          <span className="font-semibold text-white">
            {streakCount} day streak
          </span>
        </div>
      </div>

      {canClaim ? (
        <button
          onClick={claimDailyPoints}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg flex items-center justify-center transition-colors"
        >
          <FaBolt className="mr-2" />
          Claim +1000 pts
        </button>
      ) : (
        <div className="w-full py-3 px-4 bg-gray-800 text-gray-300 font-medium rounded-lg flex items-center justify-center">
          <FaBolt className="mr-2 text-gray-500" />
          Next claim in {formattedTimeRemaining}
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
