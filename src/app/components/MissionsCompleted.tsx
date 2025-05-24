"use client";

import React from "react";
import useOnboardingMissions from "../../hooks/useOnboardingMissions";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MissionsCompleted = () => {
  const { missions, isLoading } = useOnboardingMissions();

  // Filter out daily checkin since it's handled separately
  const onboardingMissions = missions.filter((m) => m.id !== "daily_checkin");
  const onboardingCompleted = onboardingMissions.filter(
    (m) => m.completed
  ).length;
  const onboardingTotal = onboardingMissions.length;

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base">Missions Completed</h3>
          <div className="text-sm text-gray-500">Onboarding progress</div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <LoadingSpinner color="#FFDD50" size={20} />
          ) : (
            <>
              <div className="text-2xl font-bold text-[#FFDD50]">
                {onboardingCompleted}
              </div>
              <div className="text-sm text-gray-400">of {onboardingTotal}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionsCompleted;
