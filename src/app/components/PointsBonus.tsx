"use client";

import React from "react";
import { usePointsBonus } from "../../hooks/usePointsBonus";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const PointsBonus = () => {
  const bonusInfo = usePointsBonus();

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x`;
  };

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-base">Points Bonus</h3>
          <div className="text-sm text-gray-500">Active multipliers</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#FFDD50]">
            {formatMultiplier(bonusInfo.totalMultiplier)}
          </div>
          <div className="text-sm text-gray-400">
            +{formatPoints(bonusInfo.bonusPoints)} bonus
          </div>
        </div>
      </div>

      {/* Multiplier breakdown */}
      <div className="space-y-2">
        {/* Streak Multiplier */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 flex items-center gap-1">
            Streak bonus
          </span>
          <span className="text-[#FFDD50] font-medium">
            {formatMultiplier(bonusInfo.streakMultiplier)}
          </span>
        </div>

        {/* Leaderboard Multiplier */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 flex items-center gap-1">
            Leaderboard rank
          </span>
          <span className="text-[#FFDD50] font-medium">
            {formatMultiplier(bonusInfo.leaderboardMultiplier)}
          </span>
        </div>

        {/* NFT Multiplier */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 flex items-center gap-1">
            NFT collections
          </span>
          <span className="text-[#FFDD50] font-medium">
            {formatMultiplier(bonusInfo.nftMultiplier)}
          </span>
        </div>

        {/* Total calculation */}
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white font-medium">Total Points</span>
            <span className="text-[#FFDD50] font-bold">
              {formatPoints(bonusInfo.multipliedPoints)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsBonus;
