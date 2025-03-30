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
  return (
    <div className="w-full mb-6">
      {/* Progress Text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold">Account Setup</span>
        <span className="text-lg font-semibold text-right">{percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#FFFFFF14] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Completion Text */}
      <div className="mt-2 text-sm text-gray-400">
        {completed} of {total} completed
      </div>
    </div>
  );
};

export default OnboardingProgress;
