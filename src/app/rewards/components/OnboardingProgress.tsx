"use client";

import React from "react";

interface OnboardingProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  completed,
  total,
  percentage,
}) => {
  // Handle potential invalid values to avoid showing NaN
  const displayPercentage =
    Number.isNaN(percentage) || !Number.isFinite(percentage) ? 0 : percentage;
  const displayCompleted = Number.isFinite(completed) ? completed : 0;
  const displayTotal = Number.isFinite(total) ? total : 0;

  // Ensure we don't show a percentage if both completed and total are 0 (loading state)
  const showAsLoading = displayCompleted === 0 && displayTotal === 0;

  return (
    <div className="w-full mb-6">
      {/* Progress Text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold">Account Setup</span>
        {showAsLoading ? (
          <span className="text-lg font-semibold text-transparent bg-gray-800 rounded animate-pulse w-12">
            &nbsp;
          </span>
        ) : (
          <span className="text-lg font-semibold text-right">
            {displayPercentage}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#FFFFFF14] rounded-full overflow-hidden">
        {showAsLoading ? (
          <div
            className="h-full bg-gray-700 rounded-full animate-pulse"
            style={{ width: "5%" }}
          ></div>
        ) : (
          <div
            className="h-full bg-gradient-to-r from-[#836EF9] to-[#9469F1] rounded-full"
            style={{ width: `${displayPercentage}%` }}
          ></div>
        )}
      </div>

      {/* Completion Text */}
      <div className="mt-2 text-sm text-gray-400">
        {showAsLoading ? (
          <span className="text-transparent bg-gray-800 rounded animate-pulse w-24">
            &nbsp;
          </span>
        ) : (
          `${displayCompleted} of ${displayTotal} completed`
        )}
      </div>
    </div>
  );
};

export default OnboardingProgress;
