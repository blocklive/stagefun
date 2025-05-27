"use client";

import React, { useState } from "react";
import { usePointsBreakdown } from "../../hooks/usePointsBreakdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const PointsBreakdownCard = () => {
  const { breakdown, isLoading, error } = usePointsBreakdown();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "funded":
        return "POOL FUNDING";
      case "raised":
        return "POOL CREATION";
      case "onboarding":
        return "MISSIONS & REFERRALS";
      case "checkin":
        return "DAILY CHECK-INS";
      default:
        return type.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner color="#8B5CF6" size={24} />
        </div>
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
        <div className="text-center py-8 text-gray-400 text-sm uppercase tracking-wider">
          BREAKDOWN UNAVAILABLE
        </div>
      </div>
    );
  }

  const hasAnyBonus = breakdown.bonusPoints > 0;

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-[#FFFFFF05] transition-colors rounded p-2 -m-2"
      >
        <div className="text-left">
          <div className="text-sm text-gray-400 uppercase tracking-wider">
            POINTS BREAKDOWN
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {hasAnyBonus ? "BASE + MULTIPLIER BONUSES" : "ALL POINTS EARNED"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-[#FFDD50] font-mono">
            {formatPoints(breakdown.totalPoints)}
          </div>
          <div className="text-gray-400 text-sm">{isExpanded ? "−" : "+"}</div>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#FFFFFF14]">
          {/* Total Summary */}
          <div className="mb-4 p-3 bg-[#FFFFFF08] rounded border border-[#FFFFFF14]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                TOTAL
              </div>
              <div className="text-xl font-bold text-[#FFDD50] font-mono">
                {formatPoints(breakdown.totalPoints)}
              </div>
            </div>
            {hasAnyBonus && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#FFFFFF14]">
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  BASE + BONUS
                </div>
                <div className="text-sm font-mono">
                  <span className="text-gray-400">
                    {formatPoints(breakdown.basePoints)}
                  </span>
                  <span className="text-gray-500 mx-2">+</span>
                  <span className="text-[#8B5CF6]">
                    {formatPoints(breakdown.bonusPoints)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="space-y-2">
            {Object.entries(breakdown.breakdown).map(([type, data]) => {
              if (data.total === 0) return null;

              const hasBonus = data.bonus > 0;

              return (
                <div
                  key={type}
                  className="p-3 bg-[#FFFFFF05] rounded border border-[#FFFFFF08]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      {getTypeLabel(type)}
                    </div>
                    <div className="text-sm font-mono text-gray-300">
                      {formatPoints(data.total)}
                    </div>
                  </div>

                  {hasBonus && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#FFFFFF08]">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">
                        BASE + BONUS
                      </div>
                      <div className="text-xs font-mono">
                        <span className="text-gray-400">
                          {formatPoints(data.base)}
                        </span>
                        <span className="text-gray-500 mx-2">+</span>
                        <span className="text-[#8B5CF6]">
                          {formatPoints(data.bonus)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!hasAnyBonus && (
            <div className="mt-4 p-3 bg-[#FFFFFF05] rounded border border-[#FFFFFF08] text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                EARN BONUS POINTS BY LEVELING UP & COLLECTING NFTS
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PointsBreakdownCard;
