"use client";

import React from "react";
import { usePointsBonus } from "../../hooks/usePointsBonus";
import { colors } from "../../lib/theme";
import { FaFire, FaTrophy, FaGem, FaStar, FaChartLine } from "react-icons/fa";

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
      className={`relative p-3 md:p-4 rounded-xl border transition-all min-h-[95px] ${
        isActive
          ? "border-[#FFFFFF14] bg-[#FFFFFF0A] shadow-sm"
          : "border-[#FFFFFF08] bg-[#FFFFFF05] opacity-50"
      }`}
    >
      <div className="text-center h-full flex flex-col justify-center">
        <div className="mb-1 flex justify-center">
          <IconComponent
            color={isActive ? colors.purple.DEFAULT : "#6B7280"}
            size={16}
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
            isActive ? "text-gray-300" : "text-gray-400"
          }`}
          style={{
            color: isActive ? colors.purple.DEFAULT : "#9CA3AF",
          }}
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
        <div className="text-sm text-gray-400">Active multipliers stacking</div>
      </div>

      {/* Mobile Layout - 2x2 Grid + Total */}
      <div className="xl:hidden">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MultiplierCard
            icon={FaFire}
            label="STREAK"
            multiplier={bonusInfo.streakMultiplier}
            isActive={bonusInfo.streakMultiplier > 1.0}
          />
          <MultiplierCard
            icon={FaTrophy}
            label="LEADER"
            multiplier={bonusInfo.leaderMultiplier}
            isActive={bonusInfo.leaderMultiplier > 1.0}
          />
          <MultiplierCard
            icon={FaStar}
            label="LEVEL"
            multiplier={bonusInfo.levelMultiplier}
            isActive={bonusInfo.levelMultiplier > 1.0}
          />
          <MultiplierCard
            icon={FaGem}
            label="ASSET"
            multiplier={bonusInfo.nftMultiplier}
            isActive={bonusInfo.nftMultiplier > 1.0}
          />
        </div>

        {/* Mobile Total */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-400 mb-2">Total Multiplier</div>
          <div className="inline-flex items-center justify-center p-4 rounded-xl border border-[#FFFFFF20] bg-[#FFFFFF0A] shadow-lg">
            <div className="text-2xl font-bold text-white font-mono">
              {formatMultiplier(bonusInfo.totalMultiplier)}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Horizontal Chain */}
      <div className="hidden xl:flex items-center justify-center gap-2 mb-8">
        {/* Streak Multiplier */}
        <div className="w-20 h-20">
          <MultiplierCard
            icon={FaFire}
            label="STREAK"
            multiplier={bonusInfo.streakMultiplier}
            isActive={bonusInfo.streakMultiplier > 1.0}
          />
        </div>

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono flex items-center`}
        >
          ×
        </div>

        {/* Leader Multiplier */}
        <div className="w-20 h-20">
          <MultiplierCard
            icon={FaTrophy}
            label="LEADER"
            multiplier={bonusInfo.leaderMultiplier}
            isActive={bonusInfo.leaderMultiplier > 1.0}
          />
        </div>

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono flex items-center`}
        >
          ×
        </div>

        {/* Level Multiplier */}
        <div className="w-20 h-20">
          <MultiplierCard
            icon={FaStar}
            label="LEVEL"
            multiplier={bonusInfo.levelMultiplier}
            isActive={bonusInfo.levelMultiplier > 1.0}
          />
        </div>

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono flex items-center`}
        >
          ×
        </div>

        {/* NFT Multiplier */}
        <div className="w-20 h-20">
          <MultiplierCard
            icon={FaGem}
            label="ASSET"
            multiplier={bonusInfo.nftMultiplier}
            isActive={bonusInfo.nftMultiplier > 1.0}
          />
        </div>

        <div
          className={`text-[${colors.purple.DEFAULT}] text-xl font-bold font-mono flex items-center`}
        >
          =
        </div>

        {/* Result Card */}
        <div className="w-20 h-20">
          <div className="relative p-3 md:p-4 rounded-xl border border-[#FFFFFF14] bg-[#FFFFFF0A] shadow-sm w-full h-full min-h-[95px] flex items-center justify-center">
            <div
              className="text-lg font-bold font-mono"
              style={{ color: colors.purple.DEFAULT }}
            >
              {formatMultiplier(bonusInfo.totalMultiplier)}
            </div>
            <div
              className={`absolute -top-1 -right-1 w-3 h-3 bg-[${colors.purple.DEFAULT}] rounded-full animate-pulse`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsBonus;
