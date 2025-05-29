"use client";

import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Mission } from "@/app/data/onboarding-missions";
import TwitterLinkButton from "@/app/components/TwitterLinkButton";
import TwitterFollowButton from "@/app/components/TwitterFollowButton";
import { useSupabase } from "@/contexts/SupabaseContext";
import { colors } from "@/lib/theme";

interface TwitterMissionModalProps {
  mission: Mission;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function TwitterMissionModal({
  mission,
  isOpen,
  onClose,
  onComplete,
}: TwitterMissionModalProps) {
  const { dbUser, refreshUser } = useSupabase();
  const [missionType, setMissionType] = useState<"link" | "follow">("link");

  useEffect(() => {
    // Determine which type of Twitter mission this is
    if (mission.id === "link_x") {
      setMissionType("link");
    } else if (mission.id === "follow_x") {
      setMissionType("follow");
    }
  }, [mission.id]);

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

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
          <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center mx-auto mb-4">
            <FaXTwitter className="text-white text-xl" />
          </div>
          <h2 className="text-2xl font-bold">{mission.title}</h2>
          <p className="text-gray-400 mt-2">{mission.description}</p>
        </div>

        {/* Content based on mission type */}
        <div className="space-y-6">
          {missionType === "link" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Connect your X (formerly Twitter) account to earn{" "}
                {mission.points.toLocaleString()} points and unlock additional
                features.
              </p>

              <div className="flex justify-center mt-4">
                <TwitterLinkButton
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
          )}

          {missionType === "follow" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Follow @stagedotfun on X to earn{" "}
                {mission.points.toLocaleString()} points and stay updated with
                the latest news.
              </p>

              {!dbUser?.twitter_username && (
                <div className="bg-[#FFFFFF0A] rounded-lg p-4 mb-4">
                  <p className="text-amber-400 text-sm">
                    You need to link your X account first before you can
                    complete this mission.
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <TwitterFollowButton
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
          )}
        </div>

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
