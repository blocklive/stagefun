"use client";

import React, { useState } from "react";
import { Mission } from "@/app/data/onboarding-missions";
import { FaCheck } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface MissionItemProps {
  mission: Mission;
  onAction: (mission: Mission) => void;
}

const MissionItem: React.FC<MissionItemProps> = ({ mission, onAction }) => {
  const { id, title, description, points, completed, actionLabel } = mission;
  const [isLoading, setIsLoading] = useState(false);
  const [hasClickedFollow, setHasClickedFollow] = useState(false);

  // Handle action click with loading state
  const handleActionClick = async () => {
    // Special handling for Twitter follow
    if (id === "follow_x") {
      if (!hasClickedFollow) {
        // First click - open Twitter profile
        window.open("https://x.com/stagedotfun", "_blank");
        setHasClickedFollow(true);
        return;
      }

      // Second click - verify follow
      setIsLoading(true);
      try {
        await onAction(mission);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For other missions, set loading state and call handler
    setIsLoading(true);
    try {
      await onAction(mission);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the current action label
  const getCurrentActionLabel = () => {
    if (id === "follow_x" && hasClickedFollow && !completed) {
      return "Verify";
    }
    return actionLabel;
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-[#FFFFFF14] last:border-b-0">
      {/* Status Icon and Mission Info */}
      <div className="flex items-center flex-1 mr-4">
        {/* Status Circle - Dotted circle for incomplete, checkmark for complete */}
        <div className="mr-4">
          {completed ? (
            <div className="w-6 h-6 rounded-full bg-[#836EF9] flex items-center justify-center">
              <FaCheck className="text-white text-xs" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-500"></div>
          )}
        </div>

        {/* Mission Text */}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>

      {/* Right Side - Points & Action Button */}
      <div className="flex flex-col items-end gap-2 min-w-[120px]">
        {/* Points */}
        <div className="text-[#FFDD50] font-medium whitespace-nowrap">
          {points.toLocaleString()} points
        </div>

        {/* Action Button - Show if not completed and has actionLabel */}
        {!completed && actionLabel && (
          <button
            onClick={handleActionClick}
            disabled={isLoading}
            className="py-1.5 px-3 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white text-sm transition-colors flex items-center justify-center min-w-20"
          >
            {isLoading ? (
              <>
                <LoadingSpinner color="#FFFFFF" size={14} />
                <span className="ml-2">Verifying...</span>
              </>
            ) : (
              getCurrentActionLabel()
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MissionItem;
