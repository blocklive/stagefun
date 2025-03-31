"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import AppHeader from "../components/AppHeader";
import InfoModal from "../components/InfoModal";
import useOnboardingMissions from "@/hooks/useOnboardingMissions";
import OnboardingProgress from "./components/OnboardingProgress";
import MissionItem from "./components/MissionItem";
import { Mission } from "../data/onboarding-missions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import showToast from "@/utils/toast";
import { usePoints } from "@/hooks/usePoints";

export default function OnboardingPage() {
  const router = useRouter();
  const { dbUser } = useSupabase();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        console.error("Error refreshing mission status:", err);
      }
    };

    // Run when the component mounts and authentication state changes
    runOnce();
  }, [dbUser, isLoading, refreshMissionStatus]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMissionStatus();
      // Also refresh points
      await refreshPoints();
      showToast.success("Mission status refreshed");
    } catch (err) {
      console.error("Error during manual refresh:", err);
      showToast.error("Error refreshing mission status");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle back navigation
  const handleBackClick = () => {
    router.push("/pools");
  };

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

    if (mission.id === "link_x") {
      router.push("/profile/settings?tab=social");
      return;
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
      <>
        <AppHeader
          showBackButton={true}
          showTitle={false}
          backgroundColor="#15161a"
          onBackClick={handleBackClick}
          onInfoClick={() => setShowInfoModal(true)}
        />
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
      </>
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
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        onBackClick={handleBackClick}
        onInfoClick={() => setShowInfoModal(true)}
      />

      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Header Section */}
        <div className="mb-8 pt-4">
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

        {/* Debug refresh button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-3 rounded-md flex items-center"
          >
            {refreshing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
                Refresh Status
              </>
            )}
          </button>
        </div>

        {/* Mission List */}
        <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden">
          {/* Show one-time missions first */}
          {onboardingMissions.map((mission) => (
            <MissionItem
              key={mission.id}
              mission={mission}
              onAction={handleMissionAction}
            />
          ))}

          {/* Show daily check-in mission if available */}
          {dailyCheckInMission && (
            <>
              <div className="border-t border-[#FFFFFF14] my-2"></div>
              <div className="px-4 py-2 text-sm text-gray-400">
                Recurring Missions
              </div>
              <MissionItem
                key={dailyCheckInMission.id}
                mission={{
                  ...dailyCheckInMission,
                  actionLabel: canClaim
                    ? "Check In"
                    : `Wait ${formattedTimeRemaining}`,
                  description: canClaim
                    ? "Check in now to earn points and build your streak"
                    : `Next check-in available in ${formattedTimeRemaining}`,
                }}
                onAction={handleMissionAction}
              />
            </>
          )}
        </div>

        {/* Show message when all missions are completed */}
        {onboardingCompletedCount === onboardingTotalCount &&
          onboardingTotalCount > 0 && (
            <div className="mt-6 p-4 bg-[#836EF914] border border-[#836EF9] rounded-lg">
              <h3 className="text-xl font-bold text-white">
                All missions completed! 🎉
              </h3>
              <p className="mt-2 text-gray-300">
                You've successfully completed all setup missions. Don't forget
                your daily check-ins!
              </p>
            </div>
          )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-white">{error}</p>
          </div>
        )}
      </div>

      {/* Info Modal */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  );
}
