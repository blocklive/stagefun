"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { useUserLevel } from "../../hooks/useUserLevel";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MyLevel = () => {
  const { points, isLoading } = usePoints();
  const levelInfo = useUserLevel(points || 0);

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-base">My Level</h3>
          <div className="text-sm text-gray-500">Current rank and progress</div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color="#FFDD50" size={20} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelInfo.emoji}</span>
              <div>
                <div className="text-lg font-bold text-[#FFDD50]">
                  Level {levelInfo.level}
                </div>
                <div className="text-sm text-[#FFDD50] font-medium">
                  {levelInfo.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isLoading && !levelInfo.isMaxLevel && (
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-[#FFDD50] h-2 rounded-full transition-all duration-300"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>

          {/* Progress text */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatPoints(levelInfo.pointsInCurrentLevel)} points</span>
            <span>
              {formatPoints(levelInfo.pointsNeededForNext)} more for Level{" "}
              {levelInfo.level + 1}
            </span>
          </div>
        </div>
      )}

      {!isLoading && levelInfo.isMaxLevel && (
        <div className="text-center py-2">
          <div className="text-sm text-[#FFDD50] font-medium">
            🎉 Maximum Level Achieved! 🎉
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLevel;
