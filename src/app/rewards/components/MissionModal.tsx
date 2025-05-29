"use client";

import React from "react";
import { FaTimes } from "react-icons/fa";
import { Mission } from "@/app/data/onboarding-missions";
import TwitterAuthButton from "@/app/components/TwitterAuthButton";
import { colors } from "@/lib/theme";

interface MissionModalProps {
  mission: Mission;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MissionModal({
  mission,
  isOpen,
  onClose,
  onComplete,
}: MissionModalProps) {
  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  const renderMissionComponent = () => {
    switch (mission.component) {
      case "TwitterLinkButton":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Connect your X (formerly Twitter) account to earn{" "}
              {mission.points.toLocaleString()} points and unlock additional
              features.
            </p>

            <div className="flex justify-center mt-4">
              <TwitterAuthButton
                onSuccess={() => {
                  setTimeout(() => {
                    onComplete();
                    onClose();
                  }, 1500);
                }}
                className="w-full py-3"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E24] rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">{mission.title}</h2>
          <p className="text-gray-400 mt-2">{mission.description}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">{renderMissionComponent()}</div>

        {/* Footer with points */}
        <div className="mt-8 pt-4 border-t border-gray-700 text-center">
          <span style={{ color: colors.purple.DEFAULT }}>
            +{mission.points.toLocaleString()} points
          </span>
        </div>
      </div>
    </div>
  );
}
