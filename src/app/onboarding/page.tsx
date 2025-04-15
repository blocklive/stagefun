"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import InfoModal from "../components/InfoModal";
import useOnboardingMissions from "@/hooks/useOnboardingMissions";
import OnboardingProgress from "./components/OnboardingProgress";
import MissionItem from "./components/MissionItem";
import { Mission } from "../data/onboarding-missions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import showToast from "@/utils/toast";
import { usePoints } from "@/hooks/usePoints";
import DailyCheckin from "../components/DailyCheckin";
import MissionModal from "./components/MissionModal";
import GetTokensModal from "../components/GetTokensModal";

export default function OnboardingPage() {
  const router = useRouter();
  const { dbUser } = useSupabase();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);

  const {
    missions,
    isLoading,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    completeMission,
    refreshMissionStatus,
  } = useOnboardingMissions();

  const {
    points,
    canClaim,
    formattedTimeRemaining,
    claimDailyPoints,
    refreshPoints,
  } = usePoints({ disableRecentMissionCheck: true });

  // Check for Twitter auth error in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");

    if (error === "twitter_auth_failed") {
      showToast.error("Failed to connect to Twitter. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, "", "/onboarding");
    }
  }, []);

  // Force a check of completed missions when the page loads
  useEffect(() => {
    const runOnce = async () => {
      // Only run if authentication is ready and user is logged in
      if (!dbUser || isLoading) {
        return;
      }

      try {
        await refreshMissionStatus();
      } catch (err) {
        // Silently handle error - no need to log during page load
        // Network errors during page refresh are expected and shouldn't clutter console
      }
    };

    // Run when the component mounts and authentication state changes
    runOnce();
  }, [dbUser, isLoading, refreshMissionStatus]);

  // Handle mission actions
  const handleMissionAction = async (mission: Mission) => {
    if (mission.id === "daily_checkin") {
      if (!canClaim) {
        showToast.error(`You can claim again in ${formattedTimeRemaining}`);
        return;
      }

      // Call the claimDailyPoints function - it handles its own success/error toasts
      await claimDailyPoints();
      return;
    }

    // Handle component-based missions
    if (mission.component) {
      // For TwitterLinkButton, we'll show the modal with the component
      if (mission.component === "TwitterLinkButton") {
        setSelectedMission(mission);
        setShowMissionModal(true);
        return;
      }
    }

    // For Twitter follow mission, completeMission will handle verification
    if (mission.id === "follow_x") {
      const success = await completeMission(mission.id);

      if (success) {
        // If successfully completed, refresh points
        await refreshPoints();
      }
      return;
    }

    // For other missions, just complete them directly
    const success = await completeMission(mission.id);
    if (success) {
      // Refresh points to show updated points after mission completion
      await refreshPoints();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Header Section - skeleton */}
        <div className="mb-8 pt-4">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-gray-800 rounded animate-pulse">
            Onboarding Missions
          </h1>
          <p className="text-transparent bg-gray-800 rounded w-3/4 animate-pulse">
            Complete these missions to finish setting up your account
          </p>
        </div>

        {/* Progress Bar - skeleton */}
        <div className="mb-6">
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

  // Calculate completion status excluding daily check-in
  // But only show it when not in loading state
  const onboardingMissions = !isLoading
    ? missions.filter((m) => m.id !== "daily_checkin")
    : [];
  const dailyCheckInMission = !isLoading
    ? missions.find((m) => m.id === "daily_checkin")
    : undefined;

  // Only calculate percentages when data is loaded
  const onboardingCompletedCount = !isLoading
    ? onboardingMissions.filter((mission) => mission.completed).length
    : 0;
  const onboardingTotalCount = !isLoading ? onboardingMissions.length : 0;
  const onboardingPercentage = !isLoading
    ? Math.round((onboardingCompletedCount / onboardingTotalCount) * 100)
    : 0;

  return (
    <>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Daily Check-in */}
        <div className="mb-8">
          <DailyCheckin />
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Onboarding Missions</h1>
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
          {/* Show one-time missions */}
          {onboardingMissions.map((mission) => (
            <MissionItem
              key={mission.id}
              mission={mission}
              onAction={handleMissionAction}
            />
          ))}
        </div>

        {/* Show message when all missions are completed */}
        {onboardingCompletedCount === onboardingTotalCount && (
          <div className="mt-8 text-center p-4 bg-[#FFFFFF0A] rounded-xl">
            <h3 className="text-xl font-bold text-green-400 mb-2">
              🎉 All missions completed!
            </h3>
            <p className="text-gray-400">
              You've completed all the onboarding missions. Continue exploring
              the platform!
            </p>
          </div>
        )}

        {/* Daily Check-in (if it exists) */}
        {dailyCheckInMission && (
          <div className="mt-8 bg-[#FFFFFF0A] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#FFFFFF14]">
              <h3 className="text-lg font-bold mb-2">Daily Check-in</h3>
              <p className="text-sm text-gray-400">
                Come back daily to earn bonus points and build your streak
              </p>
            </div>
            <MissionItem
              mission={dailyCheckInMission}
              onAction={handleMissionAction}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showMissionModal && selectedMission && (
        <MissionModal
          mission={selectedMission}
          isOpen={showMissionModal}
          onClose={() => setShowMissionModal(false)}
          onComplete={async () => {
            await refreshPoints();
            refreshMissionStatus();
          }}
        />
      )}
    </>
  );
}
