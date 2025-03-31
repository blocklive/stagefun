"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { FaBolt } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const DailyCheckin = () => {
  const {
    isLoading,
    streakCount,
    canClaim,
    formattedTimeRemaining,
    claimDailyPoints,
  } = usePoints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full p-4 bg-[#FFFFFF0A] rounded-lg">
        <LoadingSpinner color="#836EF9" size={20} />
        <span className="ml-2 text-gray-300">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-lg flex items-center justify-between">
      <div>
        <div className="text-xl font-semibold text-white flex items-center gap-2">
          {streakCount} day streak
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Claim your daily points every 24 hours
        </div>
      </div>

      {canClaim ? (
        <button
          onClick={claimDailyPoints}
          className="py-3 px-6 bg-white hover:bg-gray-100 text-[#15161A] font-medium rounded-lg flex items-center justify-center transition-colors"
        >
          Claim +100 pts
        </button>
      ) : (
        <div className="py-3 px-6 bg-white text-[#15161A] font-medium rounded-lg flex items-center justify-center">
          {formattedTimeRemaining || "..."}
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
