"use client";

import { useState, useEffect } from "react";
import {
  Mission,
  onboardingMissions as defaultMissions,
} from "@/app/data/onboarding-missions";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import showToast from "@/utils/toast";

export const useOnboardingMissions = () => {
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
  const { token: authToken, refreshToken } = useAuthJwt();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(
    new Set()
  );

  // Calculate progress metrics - only return values when data is loaded
  const completedCount = dataLoaded
    ? missions.filter((mission) => mission.completed).length
    : 0;
  const totalCount = dataLoaded ? missions.length : 0;
  const completionPercentage =
    dataLoaded && totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  // Helper function to update the completedMissionIds set
  const updateCompletedMissions = (missionId: string) => {
    setCompletedMissionIds((prev) => new Set([...prev, missionId]));
  };

  // Helper function to refresh mission status
  const refreshMissionStatus = async () => {
    if (!dbUser || !supabase) {
      return;
    }

    try {
      const userId = dbUser.id;

      // Fetch completed missions from the database
      const { data: completedMissionsData, error: fetchError } = await supabase
        .from("user_completed_missions")
        .select("mission_id, user_id")
        .eq("user_id", userId);

      if (fetchError) {
        console.error("Error fetching completed missions:", fetchError);
        throw new Error(fetchError.message);
      }

      // Create a set of completed mission IDs for quick lookup
      // Use type assertion to handle the unknown types
      const completedIds = new Set(
        (completedMissionsData || []).map((item) => String(item.mission_id))
      );

      setCompletedMissionIds(completedIds);

      // Merge the default missions with completion status
      const updatedMissions = defaultMissions.map((mission) => ({
        ...mission,
        completed: completedIds.has(mission.id),
      }));

      setMissions(updatedMissions);
    } catch (err) {
      console.error("Error refreshing mission status:", err);
    }
  };

  // Load missions and their completion status
  useEffect(() => {
    const loadMissionStatus = async () => {
      if (!dbUser || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        await refreshMissionStatus();
        // Mark data as loaded only after successful refresh
        setDataLoaded(true);
      } catch (err) {
        console.error("Error loading mission status:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load missions"
        );
        // Fall back to default missions without completion status
        setMissions(defaultMissions);
        setDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run when dbUser or supabase changes, not on every render
    loadMissionStatus();
  }, [dbUser?.id, supabase]);

  // Function to mark a mission as completed via API
  const completeMission = async (missionId: string) => {
    if (!dbUser) {
      showToast.error("You need to be logged in to complete missions");
      return false;
    }

    if (!supabase) {
      showToast.error("Database connection not available");
      return false;
    }

    try {
      // Force refresh mission status from the database first
      await refreshMissionStatus();

      // Check if the mission has already been completed
      if (completedMissionIds.has(missionId)) {
        // Make sure the mission is shown as completed in the UI
        setMissions((prevMissions) =>
          prevMissions.map((mission) =>
            mission.id === missionId ? { ...mission, completed: true } : mission
          )
        );

        return true;
      }

      // Special handling for Twitter follow mission
      if (missionId === "follow_x") {
        const loadingToastId = showToast.loading("Verifying your follow...");

        try {
          if (!authToken) {
            showToast.dismiss(loadingToastId);
            showToast.error(
              "Authentication token not available. Please try again."
            );
            return false;
          }

          // Call the Twitter follow verification API endpoint
          const response = await fetch("/api/twitter/verify-follow", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          });

          const data = await response.json();

          // Hide loading toast
          showToast.dismiss(loadingToastId);

          if (!response.ok) {
            showToast.error(data.error || "Failed to verify follow status");
            return false;
          }

          // If already completed, just acknowledge it
          if (data.alreadyCompleted) {
            // Update local state to reflect completion
            setMissions((prevMissions) =>
              prevMissions.map((mission) =>
                mission.id === missionId
                  ? { ...mission, completed: true }
                  : mission
              )
            );

            // Update completed missions cache
            updateCompletedMissions(missionId);

            return true;
          }

          // Success!
          showToast.success(
            `Thanks for following! +${data.points.toLocaleString()} points`
          );

          // Update local state to reflect completion
          setMissions((prevMissions) =>
            prevMissions.map((mission) =>
              mission.id === missionId
                ? { ...mission, completed: true }
                : mission
            )
          );

          // Update completed missions cache
          updateCompletedMissions(missionId);

          // Also trigger a points refresh to show updated points
          if (typeof window !== "undefined") {
            // Dispatch a custom event that usePoints hook can listen for
            window.dispatchEvent(new CustomEvent("refreshPoints"));
          }

          return true;
        } catch (error) {
          // Hide the loading toast and show error
          showToast.dismiss(loadingToastId);
          console.error("Error verifying Twitter follow:", error);
          showToast.error("Failed to verify follow status. Please try again.");
          return false;
        }
      }

      // Handle other mission types with the existing code
      const mission = defaultMissions.find((m) => m.id === missionId);
      if (!mission) {
        console.error(`Mission with ID ${missionId} not found`);
        return false;
      }

      // Update local state
      setMissions((prevMissions) =>
        prevMissions.map((m) =>
          m.id === missionId ? { ...m, completed: true } : m
        )
      );

      // Update database
      const { error } = await supabase.from("user_completed_missions").insert({
        user_id: dbUser.id,
        mission_id: missionId,
        completed_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error completing mission:", error);
        showToast.error("Failed to complete mission. Please try again.");

        // Revert local state
        setMissions((prevMissions) =>
          prevMissions.map((m) =>
            m.id === missionId ? { ...m, completed: false } : m
          )
        );

        return false;
      }

      // Update completed missions cache
      updateCompletedMissions(missionId);

      // Show success toast with points
      showToast.success(
        `Mission completed! +${mission.points.toLocaleString()} points`
      );

      return true;
    } catch (error) {
      console.error("Error completing mission:", error);
      showToast.error("Failed to complete mission. Please try again.");
      return false;
    }
  };

  return {
    missions,
    isLoading: isLoading || isClientLoading || !dataLoaded,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    completeMission,
    refreshMissionStatus,
  };
};

export default useOnboardingMissions;
