"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import AppHeader from "../components/AppHeader";
import InfoModal from "../components/InfoModal";
import { useState } from "react";
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
  const { claimDailyPoints, canClaim, formattedTimeRemaining } = usePoints();

  const {
    missions,
    isLoading,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    completeMission,
  } = useOnboardingMissions();

  // Handle back navigation
  const handleBackClick = () => {
    router.push("/pools");
  };

  // Handle mission actions
  const handleMissionAction = async (mission: Mission) => {
    if (mission.actionUrl) {
      // Handle daily check-in
      if (mission.id === "daily_checkin") {
        if (canClaim) {
          await claimDailyPoints();
          // No need to mark as complete - streaks are by nature recurring
        } else {
          showToast.error(`You can claim again in ${formattedTimeRemaining}`);
        }
        return;
      }

      // If the mission is to link X account
      if (mission.id === "link_x") {
        // Just navigate to profile page for now
        router.push(mission.actionUrl);
      }
      // If the mission is to follow on X
      else if (mission.id === "follow_x") {
        // Open Twitter in a new tab
        window.open(mission.actionUrl, "_blank");

        // Ask user if they followed
        if (confirm("Did you follow @stagedotfun on X?")) {
          try {
            const success = await completeMission(mission.id);
            if (success) {
              showToast.success(
                `Completed! +${mission.points.toLocaleString()} points`
              );
            }
          } catch (err) {
            console.error("Error completing mission:", err);
          }
        }
      }
      // If the mission is to create a pool
      else if (mission.id === "create_pool") {
        // Just navigate to the create pool page
        router.push(mission.actionUrl);
      }
      // For other mission types
      else {
        // Handle generic mission - just navigate to the URL
        if (mission.actionUrl.startsWith("http")) {
          window.open(mission.actionUrl, "_blank");
        } else {
          router.push(mission.actionUrl);
        }
      }
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
        <div className="flex items-center justify-center h-[70vh]">
          <LoadingSpinner size={40} />
        </div>
      </>
    );
  }

  // Prepare mission items for display
  // Filter out daily check-in from progress calculation
  // since it's not a one-time completion mission
  const onboardingMissions = missions.filter((m) => m.id !== "daily_checkin");
  const dailyCheckInMission = missions.find((m) => m.id === "daily_checkin");

  // Calculate completion status excluding daily check-in
  const onboardingCompletedCount = onboardingMissions.filter(
    (mission) => mission.completed
  ).length;
  const onboardingTotalCount = onboardingMissions.length;
  const onboardingPercentage = Math.round(
    (onboardingCompletedCount / onboardingTotalCount) * 100
  );

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
