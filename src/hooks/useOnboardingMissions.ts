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
  const [error, setError] = useState<string | null>(null);

  // Calculate progress metrics
  const completedCount = missions.filter((mission) => mission.completed).length;
  const totalCount = missions.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Load missions and their completion status
  useEffect(() => {
    const loadMissionStatus = async () => {
      if (!dbUser || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch completed missions from the database
        const { data: completedMissionsData, error: fetchError } =
          await supabase
            .from("user_completed_missions")
            .select("mission_id")
            .eq("user_id", dbUser.id);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        // Create a set of completed mission IDs for quick lookup
        const completedMissionIds = new Set(
          completedMissionsData?.map(
            (item: { mission_id: string }) => item.mission_id
          ) || []
        );

        // Merge the default missions with completion status
        const updatedMissions = defaultMissions.map((mission) => ({
          ...mission,
          completed: completedMissionIds.has(mission.id),
        }));

        setMissions(updatedMissions);
      } catch (err) {
        console.error("Error loading mission status:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load missions"
        );
        // Fall back to default missions without completion status
        setMissions(defaultMissions);
      } finally {
        setIsLoading(false);
      }
    };

    loadMissionStatus();
  }, [dbUser, supabase]);

  // Function to mark a mission as completed via API
  const completeMission = async (missionId: string) => {
    if (!dbUser) {
      return false;
    }

    try {
      // Get a fresh token if needed
      let token = authToken;
      if (!token) {
        token = await refreshToken();
      }

      if (!token) {
        console.error("No auth token available");
        return false;
      }

      // Call the API to award points
      const response = await fetch("/api/points/award-mission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ missionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Error completing mission:",
          result.error || result.message
        );
        return false;
      }

      // Update local state if API call was successful
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === missionId ? { ...mission, completed: true } : mission
        )
      );

      // Show success toast if not the pool creation (which shows its own)
      if (missionId !== "create_pool") {
        showToast.success(
          `Mission completed! +${result.points.toLocaleString()} points`
        );
      }

      return true;
    } catch (err) {
      console.error("Error completing mission:", err);
      return false;
    }
  };

  return {
    missions,
    isLoading: isLoading || isClientLoading,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    completeMission,
  };
};

export default useOnboardingMissions;
