"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useOnboardingMissions } from "@/hooks/useOnboardingMissions";
import { FaFire } from "react-icons/fa";

interface PointsButtonProps {
  onClick?: () => void;
}

const PointsButton: React.FC<PointsButtonProps> = ({ onClick }) => {
  const { points, isLoading, canClaim, streakCount } = usePoints();
  const {
    missions,
    isLoading: missionsLoading,
    completedCount,
    totalCount,
  } = useOnboardingMissions();

  // Format points function
  const formatPoints = (value: number | null): string => {
    if (value === null) {
      return "...";
    }

    if (value < 1000) {
      return value.toString();
    } else {
      return (Math.floor(value / 100) / 10).toFixed(1) + "k";
    }
  };

  // Check if there are truly incomplete missions that need action
  // Filter out completed missions and daily check-in if already claimed
  const hasIncompleteActionableMissions = missions.some(
    (mission) => !mission.completed && mission.id !== "daily_checkin"
  );

  // Determine which indicator to show
  // Priority: 1. Fire icon for streak + check-in, 2. Red dot for incomplete missions
  const showFireIcon = canClaim && streakCount > 1;

  // Only show the red dot if there are incomplete missions (excluding daily check-in)
  // AND we're not showing the fire icon
  const showRedDot = hasIncompleteActionableMissions && !showFireIcon;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="h-10 flex items-center justify-center px-4 rounded-full bg-[#FFDD5014] text-[#FFDD50] hover:bg-[#FFDD5024] transition-colors border border-[#FFDD5033]"
        aria-label="Points"
      >
        {isLoading ? (
          <LoadingSpinner color="#FFDD50" size={14} />
        ) : (
          <span className="font-medium text-sm">
            {formatPoints(points)}
            <span className="hidden [@media(min-width:385px)]:inline">
              {" "}
              pts
            </span>
          </span>
        )}
      </button>

      {/* Fire icon for streak + daily check-in */}
      {showFireIcon && (
        <div
          className="absolute rounded-full bg-[#FFDD50] flex items-center justify-center"
          style={{ width: "16px", height: "16px", right: "-2px", top: "3px" }}
        >
          <FaFire className="text-black text-xs" />
        </div>
      )}

      {/* Red dot for incomplete missions or daily check-in */}
      {!isLoading && !missionsLoading && showRedDot && (
        <div
          className="absolute rounded-full bg-[#FFDD50]"
          style={{ width: "10px", height: "10px", right: "-2px", top: "3px" }}
        />
      )}
    </div>
  );
};

export default PointsButton;
