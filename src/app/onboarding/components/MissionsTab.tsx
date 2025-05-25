"use client";

import React from "react";
import useOnboardingMissions from "@/hooks/useOnboardingMissions";
import OnboardingProgress from "./OnboardingProgress";
import MissionItem from "./MissionItem";
import { Mission } from "../../data/onboarding-missions";
import { useRouter } from "next/navigation";
import { usePoints } from "@/hooks/usePoints";
import showToast from "@/utils/toast";

interface MissionsTabProps {
  onMissionAction: (mission: Mission) => Promise<void>;
}

export default function MissionsTab({ onMissionAction }: MissionsTabProps) {
  const {
    missions,
    isLoading,
    completedCount,
    totalCount,
    completionPercentage,
  } = useOnboardingMissions();

  // Calculate completion status excluding daily check-in
  const onboardingMissions = !isLoading
    ? missions.filter((m) => m.id !== "daily_checkin")
    : [];

  // Only calculate percentages when data is loaded
  const onboardingCompletedCount = !isLoading
    ? onboardingMissions.filter((mission) => mission.completed).length
    : 0;
  const onboardingTotalCount = !isLoading ? onboardingMissions.length : 0;
  const onboardingPercentage = !isLoading
    ? Math.round((onboardingCompletedCount / onboardingTotalCount) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Section - skeleton */}
        <div>
          <h2 className="text-2xl font-bold mb-2 text-transparent bg-gray-800 rounded animate-pulse">
            Onboarding Missions
          </h2>
          <p className="text-transparent bg-gray-800 rounded w-3/4 animate-pulse">
            Complete these missions to finish setting up your account
          </p>
        </div>

        {/* Progress Bar - skeleton */}
        <div>
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <div className="text-transparent bg-gray-800 w-32 h-5 rounded animate-pulse"></div>
            <div className="text-transparent bg-gray-800 w-16 h-5 rounded animate-pulse"></div>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-700 rounded-full animate-pulse"
              style={{ width: "0%" }}
            ></div>
          </div>
        </div>

        {/* Mission List - skeleton */}
        <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border-b border-[#FFFFFF14]"
            >
              <div className="flex items-center">
                <div className="mr-4 w-6 h-6 rounded-full border-2 border-dashed border-gray-700 animate-pulse"></div>
                <div>
                  <h3 className="text-lg w-32 h-6 bg-gray-800 rounded animate-pulse mb-2"></h3>
                  <p className="text-sm w-48 h-4 bg-gray-800 rounded animate-pulse"></p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-20 h-5 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-gray-800 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Onboarding Missions</h2>
        <p className="text-gray-400">
          Complete these missions to finish setting up your account
        </p>
      </div>

      {/* Progress Bar */}
      <OnboardingProgress
        completed={onboardingCompletedCount}
        total={onboardingTotalCount}
        percentage={onboardingPercentage}
      />

      {/* Mission List */}
      <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden">
        {onboardingMissions.map((mission) => (
          <MissionItem
            key={mission.id}
            mission={mission}
            onAction={onMissionAction}
          />
        ))}
      </div>

      {/* Show message when all missions are completed */}
      {onboardingCompletedCount === onboardingTotalCount &&
        onboardingTotalCount > 0 && (
          <div className="text-center p-4 bg-[#FFFFFF0A] rounded-xl">
            <h3 className="text-xl font-bold text-[#FFDD50] mb-2">
              🎉 All missions completed!
            </h3>
            <p className="text-gray-400">
              You've completed all the onboarding missions. Continue exploring
              the platform!
            </p>
          </div>
        )}
    </div>
  );
}
