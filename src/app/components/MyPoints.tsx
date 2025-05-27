"use client";

import React, { useState } from "react";
import { usePoints } from "../../hooks/usePoints";
import { usePointsBreakdown } from "../../hooks/usePointsBreakdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MyPoints = () => {
  const { points, isLoading } = usePoints();
  const { breakdown, isLoading: breakdownLoading } = usePointsBreakdown();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const formatPoints = (value: number | null): string => {
    if (value === null) return "...";
    return value.toLocaleString();
  };

  const hasBonus = breakdown && breakdown.bonusPoints > 0;

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl border border-[#FFFFFF14]">
      {/* Main Points Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-400 uppercase tracking-wider">
          TOTAL POINTS
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color="#FFDD50" size={20} />
          ) : (
            <div className="text-2xl font-bold text-[#FFDD50] font-mono">
              {formatPoints(points)}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Toggle */}
      {hasBonus && !breakdownLoading && (
        <>
          <div className="h-px bg-[#FFFFFF14] mb-3"></div>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 transition-colors uppercase tracking-wider"
          >
            <span>BASE + BONUS</span>
            <span className="text-[#FFDD50] font-mono">
              {formatPoints(breakdown.basePoints)} +{" "}
              {formatPoints(breakdown.bonusPoints)}
            </span>
          </button>

          {/* Detailed Breakdown */}
          {showBreakdown && (
            <div className="mt-3 pt-3 border-t border-[#FFFFFF14] space-y-2">
              {/* Category Breakdown */}
              {Object.entries(breakdown.breakdown).map(([type, data]) => {
                if (data.total === 0) return null;
                return (
                  <div
                    key={type}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-gray-400 uppercase tracking-wider">
                      {type === "funded"
                        ? "FUNDING"
                        : type === "raised"
                        ? "CREATION"
                        : type === "onboarding"
                        ? "MISSIONS"
                        : type === "checkin"
                        ? "CHECKINS"
                        : type}
                    </span>
                    <div className="text-right font-mono">
                      {data.bonus > 0 ? (
                        <div className="text-gray-300">
                          <span className="text-gray-400">
                            {formatPoints(data.base)}
                          </span>
                          <span className="text-gray-500 mx-1">+</span>
                          <span className="text-[#8B5CF6]">
                            {formatPoints(data.bonus)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">
                          {formatPoints(data.total)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyPoints;
