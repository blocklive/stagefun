"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { useUserLevel } from "../../hooks/useUserLevel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FiArrowUp } from "react-icons/fi";
import { colors } from "@/lib/theme";

// Helper function to get level multiplier (from usePointsBonus.ts logic)
const getLevelMultiplier = (points: number): number => {
  // Level 10+ - 1.4x
  if (points >= 100000) return 1.4;
  // Level 8+ - 1.3x
  if (points >= 75000) return 1.3;
  // Level 6+ - 1.25x
  if (points >= 50000) return 1.25;
  // Level 4+ - 1.2x
  if (points >= 25000) return 1.2;
  // Level 2+ - 1.1x
  if (points >= 10000) return 1.1;
  // Level 1 - 1x
  return 1.0;
};

// Helper function to get referral code limits
const getMaxCodesForLevel = (level: number): number => {
  if (level <= 5) return 1; // levels 1-5 get 1 code
  return level - 4; // level 6+ gets level-4 codes (level 6 = 2, level 7 = 3, etc.)
};

// Helper function to get next level benefits
const getNextLevelBenefits = (
  currentLevel: number,
  nextLevelPoints: number
) => {
  if (currentLevel >= 20) return null; // Max level

  const nextLevel = currentLevel + 1;
  const nextLevelMultiplier = getLevelMultiplier(nextLevelPoints);
  const nextLevelCodes = getMaxCodesForLevel(nextLevel);

  return {
    multiplier: nextLevelMultiplier,
    codes: nextLevelCodes,
  };
};

const MyLevel = () => {
  const { points, isLoading } = usePoints();
  const levelInfo = useUserLevel(points || 0);

  const formatPoints = (value: number): string => {
    return value.toLocaleString();
  };

  // Get next level benefits
  const nextLevelBenefits = getNextLevelBenefits(
    levelInfo.level,
    levelInfo.pointsForNextLevel
  );

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-base">My Level</h3>
          <div className="text-sm text-gray-500">Current rank and progress</div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color={colors.purple.DEFAULT} size={20} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelInfo.emoji}</span>
              <div>
                <div
                  className="text-lg font-bold"
                  style={{ color: colors.purple.DEFAULT }}
                >
                  Level {levelInfo.level}
                </div>
                <div className="text-sm font-medium text-gray-400">
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
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${levelInfo.progress}%`,
                backgroundColor: colors.purple.DEFAULT,
              }}
            ></div>
          </div>

          {/* Progress text */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatPoints(levelInfo.pointsInCurrentLevel)} points</span>
            <span>
              <span
                style={{ color: colors.purple.DEFAULT }}
                className="font-medium"
              >
                {formatPoints(levelInfo.pointsNeededForNext)}
              </span>{" "}
              more for Level{" "}
              <span
                style={{ color: colors.purple.DEFAULT }}
                className="font-medium"
              >
                {levelInfo.level + 1}
              </span>
            </span>
          </div>

          {/* Next level benefits */}
          {nextLevelBenefits && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <FiArrowUp className="text-[#836EF9]" size={12} />
              <span className="text-xs">
                Next Level: increase multiplier{" "}
                <span
                  style={{ color: colors.purple.DEFAULT }}
                  className="font-medium"
                >
                  {nextLevelBenefits.multiplier.toFixed(2)}x
                </span>{" "}
                and referral codes{" "}
                <span
                  style={{ color: colors.purple.DEFAULT }}
                  className="font-medium"
                >
                  {nextLevelBenefits.codes}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {!isLoading && levelInfo.isMaxLevel && (
        <div className="text-center py-2">
          <div
            className="text-sm font-medium"
            style={{ color: colors.purple.DEFAULT }}
          >
            🎉 Maximum Level Achieved! 🎉
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLevel;
