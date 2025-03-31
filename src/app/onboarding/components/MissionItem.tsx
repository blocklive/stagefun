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
  const { id, title, description, points, completed, actionLabel, component } =
    mission;
  const [isLoading, setIsLoading] = useState(false);

  // Handle action click with loading state
  const handleActionClick = async () => {
    // Only show loading for Twitter follow verification
    if (id === "follow_x") {
      setIsLoading(true);

      try {
        await onAction(mission);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 500); // Add a slight delay to ensure UI feels responsive
      }
    } else {
      // For other missions, just call the handler directly
      onAction(mission);
    }
  };

  // Determine if we should show the action button
  const shouldShowActionButton = !completed && (actionLabel || component);

  return (
    <div className="flex items-center justify-between p-4 border-b border-[#FFFFFF14] last:border-b-0">
      {/* Status Icon and Mission Info */}
      <div className="flex items-center">
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
      <div className="flex flex-col items-end gap-2">
        {/* Points */}
        <div className="text-[#FFDD50] font-medium">
          {points.toLocaleString()} points
        </div>

        {/* Action Button - Show if not completed and has actionLabel or component */}
        {shouldShowActionButton && (
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
              actionLabel || "Connect"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MissionItem;
