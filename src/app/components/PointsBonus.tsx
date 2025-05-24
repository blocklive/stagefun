"use client";

import React from "react";
import { usePointsBonus } from "../../hooks/usePointsBonus";

const PointsBonus = () => {
  const bonusInfo = usePointsBonus();

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x`;
  };

  // Get tier name based on total multiplier
  const getTierName = (multiplier: number): string => {
    if (multiplier >= 2.0) return "GODLIKE";
    if (multiplier >= 1.8) return "LEGENDARY";
    if (multiplier >= 1.6) return "EPIC";
    if (multiplier >= 1.4) return "RARE";
    if (multiplier >= 1.2) return "UNCOMMON";
    return "COMMON";
  };

  // Get tier color based on total multiplier
  const getTierColor = (multiplier: number): string => {
    if (multiplier >= 2.0) return "from-purple-500 to-pink-500";
    if (multiplier >= 1.8) return "from-orange-500 to-red-500";
    if (multiplier >= 1.6) return "from-yellow-400 to-orange-500";
    if (multiplier >= 1.4) return "from-blue-400 to-purple-500";
    if (multiplier >= 1.2) return "from-green-400 to-blue-500";
    return "from-gray-400 to-gray-600";
  };

  const MultiplierCard = ({
    icon,
    label,
    multiplier,
    isActive = true,
  }: {
    icon: string;
    label: string;
    multiplier: number;
    isActive?: boolean;
  }) => (
    <div
      className={`relative p-4 rounded-lg border-2 bg-gradient-to-br transition-all w-20 h-20 ${
        isActive
          ? "border-[#FFDD50] from-[#FFFFFF08] to-[#FFDD50]10 shadow-lg"
          : "border-gray-600 from-gray-800 to-gray-700 opacity-50"
      }`}
    >
      <div className="text-center h-full flex flex-col justify-center">
        <div className="text-lg mb-1">{icon}</div>
        <div
          className={`text-xs font-medium mb-1 ${
            isActive ? "text-gray-300" : "text-gray-500"
          }`}
        >
          {label}
        </div>
        <div
          className={`text-sm font-bold ${
            isActive ? "text-[#FFDD50]" : "text-gray-400"
          }`}
        >
          {formatMultiplier(multiplier)}
        </div>
      </div>
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FFDD50] rounded-full animate-pulse"></div>
      )}
    </div>
  );

  const tierName = getTierName(bonusInfo.totalMultiplier);
  const tierColor = getTierColor(bonusInfo.totalMultiplier);

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-white text-base mb-1">Bonus Rewards</h3>
        <div className="text-sm text-gray-400">Power-ups stacking</div>
      </div>

      {/* Combo Visual */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {/* Streak Multiplier */}
        <MultiplierCard
          icon="🔥"
          label="Streak"
          multiplier={bonusInfo.streakMultiplier}
          isActive={bonusInfo.streakMultiplier > 1.0}
        />

        <div className="text-[#FFDD50] text-xl font-bold">×</div>

        {/* Leaderboard Multiplier */}
        <MultiplierCard
          icon="🏆"
          label="Leader"
          multiplier={bonusInfo.leaderboardMultiplier}
          isActive={bonusInfo.leaderboardMultiplier > 1.0}
        />

        <div className="text-[#FFDD50] text-xl font-bold">×</div>

        {/* NFT Multiplier */}
        <MultiplierCard
          icon="💎"
          label="NFT"
          multiplier={bonusInfo.nftMultiplier}
          isActive={bonusInfo.nftMultiplier > 1.0}
        />

        <div className="text-[#FFDD50] text-xl font-bold">=</div>

        {/* Result Card */}
        <div
          className={`relative p-4 rounded-lg border-2 border-[#FFDD50] bg-gradient-to-br ${tierColor} shadow-xl w-20 h-20`}
        >
          <div className="text-center h-full flex flex-col justify-center">
            <div className="text-lg font-bold text-white">
              {formatMultiplier(bonusInfo.totalMultiplier)}
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-lg bg-[#FFDD50] opacity-20 blur-sm"></div>
        </div>
      </div>

      {/* Bonus Points Display */}
      <div className="text-center p-3 bg-[#FFFFFF08] rounded-lg border border-[#FFFFFF14]">
        <div className="text-sm text-gray-400 mb-1">💰 Bonus Points Earned</div>
        <div className="text-xl font-bold text-[#FFDD50]">
          +{formatPoints(bonusInfo.bonusPoints)}
        </div>
      </div>
    </div>
  );
};

export default PointsBonus;
