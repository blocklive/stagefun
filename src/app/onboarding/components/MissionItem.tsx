"use client";

import React from "react";
import { Mission } from "@/app/data/onboarding-missions";
import { FaCheck } from "react-icons/fa";

interface MissionItemProps {
  mission: Mission;
  onAction: (mission: Mission) => void;
}

const MissionItem: React.FC<MissionItemProps> = ({ mission, onAction }) => {
  const { title, description, points, completed, actionLabel } = mission;

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

        {/* Action Button - Show only if not completed */}
        {!completed && actionLabel && (
          <button
            onClick={() => onAction(mission)}
            className="py-1.5 px-3 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white text-sm transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default MissionItem;
