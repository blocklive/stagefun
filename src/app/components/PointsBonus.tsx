"use client";

import React from "react";
import { usePointsBonus } from "../../hooks/usePointsBonus";
import { colors } from "../../lib/theme";
import { FaFire, FaTrophy, FaGem } from "react-icons/fa";

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
    if (multiplier >= 2.0) return "APEX";
    if (multiplier >= 1.8) return "ELITE";
    if (multiplier >= 1.6) return "PRIME";
    if (multiplier >= 1.4) return "ALPHA";
    if (multiplier >= 1.2) return "BETA";
    return "BASE";
  };

  // Get tier color based on total multiplier - simplified gradients
  const getTierColor = (multiplier: number): string => {
    if (multiplier >= 2.0)
      return `from-[${colors.purple.DEFAULT}] to-[${colors.purple.light}]`;
    if (multiplier >= 1.8)
      return `from-[${colors.purple.DEFAULT}] to-[${colors.purple.DEFAULT}]`;
    if (multiplier >= 1.6)
      return `from-[${colors.purple.dark}] to-[${colors.purple.DEFAULT}]`;
    if (multiplier >= 1.4)
      return `from-[${colors.purple.dark}] to-[${colors.purple.DEFAULT}]`;
    if (multiplier >= 1.2)
      return `from-[${colors.purple.dark}] to-[${colors.purple.DEFAULT}]`;
    return "from-gray-500 to-gray-600";
  };

  const MultiplierCard = ({
    icon: IconComponent,
    label,
    multiplier,
    isActive = true,
  }: {
    icon: React.ComponentType<{ color?: string; size?: number }>;
    label: string;
    multiplier: number;
    isActive?: boolean;
  }) => (
    <div
      className={`relative p-4 rounded-xl border transition-all w-20 h-20 ${
        isActive
          ? `border-[${colors.purple.DEFAULT}] bg-[#FFFFFF0A] shadow-sm`
          : "border-gray-600 bg-[#FFFFFF05] opacity-50"
      }`}
    >
      <div className="text-center h-full flex flex-col justify-center">
        <div className="mb-1 flex justify-center">
          <IconComponent
            color={isActive ? colors.purple.DEFAULT : "#6B7280"}
            size={20}
          />
        </div>
        <div
          className={`text-xs font-medium mb-1 tracking-wider ${
            isActive ? "text-gray-300" : "text-gray-500"
          }`}
        >
          {label}
        </div>
        <div
          className={`text-sm font-bold font-mono ${
            isActive ? `text-[${colors.points.DEFAULT}]` : "text-gray-400"
          }`}
        >
          {formatMultiplier(multiplier)}
        </div>
      </div>
      {isActive && (
        <div
          className={`absolute -top-1 -right-1 w-3 h-3 bg-[${colors.purple.DEFAULT}] rounded-full animate-pulse`}
        ></div>
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
        <div className="text-sm text-gray-400">Active protocols stacking</div>
      </div>

      {/* Combo Visual */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {/* Streak Multiplier */}
        <MultiplierCard
          icon={FaFire}
          label="STREAK"
          multiplier={bonusInfo.streakMultiplier}
          isActive={bonusInfo.streakMultiplier > 1.0}
        />

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono`}
        >
          ×
        </div>

        {/* Leaderboard Multiplier */}
        <MultiplierCard
          icon={FaTrophy}
          label="RANK"
          multiplier={bonusInfo.leaderboardMultiplier}
          isActive={bonusInfo.leaderboardMultiplier > 1.0}
        />

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono`}
        >
          ×
        </div>

        {/* NFT Multiplier */}
        <MultiplierCard
          icon={FaGem}
          label="ASSET"
          multiplier={bonusInfo.nftMultiplier}
          isActive={bonusInfo.nftMultiplier > 1.0}
        />

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono`}
        >
          =
        </div>

        {/* Result Card */}
        <div
          className={`relative p-4 rounded-xl border-2 border-[${colors.purple.DEFAULT}] bg-gradient-to-br ${tierColor} shadow-lg w-20 h-20`}
        >
          <div className="text-center h-full flex flex-col justify-center">
            <div className="text-lg font-bold text-white font-mono">
              {formatMultiplier(bonusInfo.totalMultiplier)}
            </div>
          </div>
          {/* Glow effect */}
          <div
            className={`absolute inset-0 rounded-xl bg-[${colors.purple.DEFAULT}] opacity-10 blur-sm`}
          ></div>
        </div>
      </div>

      {/* Bonus Points Display */}
      <div className="text-center p-3 bg-[#FFFFFF08] rounded-lg border border-[#FFFFFF14]">
        <div className="text-sm text-gray-400 mb-1">Bonus Points Generated</div>
        <div
          className={`text-xl font-bold text-[${colors.points.DEFAULT}] font-mono`}
        >
          +{formatPoints(bonusInfo.bonusPoints)}
        </div>
      </div>
    </div>
  );
};

export default PointsBonus;
