"use client";

import React from "react";
import { usePointsBreakdown } from "../../hooks/usePointsBreakdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FaCoins, FaRocket, FaGift, FaCalendarCheck } from "react-icons/fa";
import { colors } from "../../lib/theme";

const PointsBreakdownCard = () => {
  const { breakdown, isLoading, error } = usePointsBreakdown();

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "funded":
        return <FaCoins className="text-blue-400" size={16} />;
      case "raised":
        return <FaRocket className="text-green-400" size={16} />;
      case "onboarding":
        return <FaGift className="text-purple-400" size={16} />;
      case "checkin":
        return <FaCalendarCheck className="text-yellow-400" size={16} />;
      default:
        return <FaCoins className="text-gray-400" size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "funded":
        return "Pool Funding";
      case "raised":
        return "Pool Creation";
      case "onboarding":
        return "Missions & Referrals";
      case "checkin":
        return "Daily Check-ins";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner color={colors.purple.DEFAULT} size={24} />
        </div>
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
        <div className="text-center py-8 text-gray-400">
          Unable to load points breakdown
        </div>
      </div>
    );
  }

  const hasAnyBonus = breakdown.bonusPoints > 0;

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-white text-base mb-1">
          Points Breakdown
        </h3>
        <div className="text-sm text-gray-400">
          {hasAnyBonus
            ? "Base points + multiplier bonuses"
            : "All points earned"}
        </div>
      </div>

      {/* Total Summary */}
      <div className="mb-6 p-3 bg-[#FFFFFF08] rounded-lg border border-[#FFFFFF14]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Total Points</div>
            <div
              className={`text-2xl font-bold text-[${colors.points.DEFAULT}] font-mono`}
            >
              {formatPoints(breakdown.totalPoints)}
            </div>
          </div>
          {hasAnyBonus && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Breakdown</div>
              <div className="text-sm text-gray-300">
                <span className="text-gray-400">
                  {formatPoints(breakdown.basePoints)}
                </span>
                <span className="text-gray-500 mx-1">+</span>
                <span
                  className={`text-[${colors.purple.DEFAULT}] font-semibold`}
                >
                  {formatPoints(breakdown.bonusPoints)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {Object.entries(breakdown.breakdown).map(([type, data]) => {
          if (data.total === 0) return null;

          const hasBonus = data.bonus > 0;
          const bonusPercentage =
            data.total > 0 ? (data.bonus / data.total) * 100 : 0;

          return (
            <div
              key={type}
              className="p-3 bg-[#FFFFFF05] rounded-lg border border-[#FFFFFF08]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(type)}
                  <span className="text-sm font-medium text-gray-300">
                    {getTypeLabel(type)}
                  </span>
                </div>
                <div className="text-sm font-mono text-gray-300">
                  {formatPoints(data.total)}
                </div>
              </div>

              {hasBonus && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Base: {formatPoints(data.base)}</span>
                    <span>
                      Bonus: +{formatPoints(data.bonus)} (
                      {bonusPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#FFFFFF08] rounded-full h-1.5">
                    <div
                      className={`bg-[${colors.purple.DEFAULT}] h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${bonusPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!hasAnyBonus && (
        <div className="mt-4 p-3 bg-[#FFFFFF05] rounded-lg border border-[#FFFFFF08] text-center">
          <div className="text-sm text-gray-400">
            🚀 Start earning bonus points by increasing your level and
            collecting NFTs!
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBreakdownCard;
