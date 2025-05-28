"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import InfoModal from "../components/InfoModal";
import useOnboardingMissions from "@/hooks/useOnboardingMissions";
import { Mission } from "../data/onboarding-missions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import showToast from "@/utils/toast";
import { usePoints } from "@/hooks/usePoints";
import DailyCheckin from "../components/DailyCheckin";
import MissionModal from "./components/MissionModal";
import GetTokensModal from "../components/GetTokensModal";
import TabComponent from "@/app/profile/components/TabComponent";
import RewardsTab from "./components/RewardsTab";
import MissionsTab from "./components/MissionsTab";
import LeaderboardTab from "./components/LeaderboardTab";

export default function OnboardingPage() {
  const router = useRouter();
  const { dbUser } = useSupabase();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "rewards" | "missions" | "leaderboard"
  >("rewards");

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

  // Calculate mission counts excluding daily check-in (matches MissionsTab logic)
  const onboardingMissions = !isLoading
    ? missions.filter((m) => m.id !== "daily_checkin")
    : [];
  const onboardingCompletedCount = onboardingMissions.filter(
    (m) => m.completed
  ).length;
  const onboardingTotalCount = onboardingMissions.length;

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
      window.history.replaceState({}, "", "/rewards");
    }
  }, []);

  // Handle mission actions
  const handleMissionAction = async (mission: Mission) => {
    // If mission has an actionUrl, navigate to that URL instead of completing the mission
    if (mission.actionUrl) {
      router.push(mission.actionUrl);
      return;
    }

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

  return (
    <>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Daily Check-in */}
        <div className="mb-8">
          <DailyCheckin />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <TabComponent
            tabs={[
              { id: "rewards", label: "Rewards" },
              {
                id: "missions",
                label: "Missions",
                hasNotification:
                  !isLoading && onboardingCompletedCount < onboardingTotalCount,
              },
              { id: "leaderboard", label: "Leaderboard" },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) =>
              setActiveTab(tabId as "rewards" | "missions" | "leaderboard")
            }
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "rewards" && <RewardsTab />}
          {activeTab === "missions" && (
            <MissionsTab onMissionAction={handleMissionAction} />
          )}
          {activeTab === "leaderboard" && <LeaderboardTab />}
        </div>
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
