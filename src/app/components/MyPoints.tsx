"use client";

import React, { useState } from "react";
import { usePoints } from "../../hooks/usePoints";
import { usePointsBreakdown } from "../../hooks/usePointsBreakdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

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
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base">My Points</h3>
          <div className="text-sm text-gray-500">
            {hasBonus ? "Base + bonus points earned" : "Total points earned"}
          </div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color="#FFDD50" size={20} />
          ) : (
            <div>
              <div className="text-2xl font-bold text-[#FFDD50]">
                {formatPoints(points)}
              </div>
              {hasBonus && !breakdownLoading && (
                <div className="text-xs text-gray-400 mt-1">
                  {formatPoints(breakdown.basePoints)} base +{" "}
                  {formatPoints(breakdown.bonusPoints)} bonus
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasBonus && (
        <div className="mt-3 pt-3 border-t border-[#FFFFFF14]">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <span>View breakdown</span>
            {showBreakdown ? (
              <FaChevronUp size={12} />
            ) : (
              <FaChevronDown size={12} />
            )}
          </button>

          {showBreakdown && breakdown && (
            <div className="mt-3 space-y-2">
              {Object.entries(breakdown.breakdown).map(([type, data]) => {
                if (data.total === 0) return null;
                return (
                  <div key={type} className="flex justify-between text-xs">
                    <span className="text-gray-400 capitalize">{type}:</span>
                    <span className="text-gray-300">
                      {data.bonus > 0
                        ? `${formatPoints(data.base)} + ${formatPoints(
                            data.bonus
                          )} = ${formatPoints(data.total)}`
                        : formatPoints(data.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPoints;
