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
        // Don't log expected network errors during initialization
        if (!fetchError.message.includes("NetworkError")) {
          console.error("Error fetching completed missions:", fetchError);
        }

        // If we have existing missions data, don't overwrite it on error
        if (missions.length > 0) {
          return;
        }
        // Otherwise, show default missions without completion status
        setMissions(defaultMissions);
        return;
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
      // Don't log expected network errors during initialization
      const error = err as Error;
      if (!error.message?.includes("NetworkError")) {
        console.error("Error refreshing mission status:", err);
      }

      // If we have existing missions data, don't overwrite it on error
      if (missions.length > 0) {
        return;
      }
      // Otherwise, show default missions without completion status
      setMissions(defaultMissions);
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
        // Don't log network errors during initialization as they're expected
        // during page refreshes before connections are established

        // Still need to set an error state for the UI
        const isNetworkError =
          err instanceof Error && err.message.includes("NetworkError");

        if (!isNetworkError) {
          console.error("Error loading mission status:", err);
        }

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

    // Only run when dbUser ID changes or when we first get a supabase client
    loadMissionStatus();
  }, [dbUser?.id, !!supabase]);

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

      // Special handling for Twitter verification
      if (missionId === "link_x") {
        const loadingToastId = showToast.loading("Verifying X account...");

        try {
          if (!authToken) {
            showToast.remove(loadingToastId);
            showToast.error(
              "Authentication token not available. Please try again."
            );
            return false;
          }

          // Call the Twitter verification API endpoint
          const response = await fetch("/api/missions/verify-twitter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          });

          const data = await response.json();

          // Remove loading toast regardless of outcome now
          showToast.remove(loadingToastId);

          if (!response.ok) {
            showToast.error(data.error || "Failed to verify X account");
            return false;
          }

          // Handle based on the new API response structure
          if (data.alreadyCompleted) {
            // Update local state just in case it wasn't already set
            setMissions((prevMissions) =>
              prevMissions.map((mission) =>
                mission.id === missionId
                  ? { ...mission, completed: true }
                  : mission
              )
            );
            updateCompletedMissions(missionId);
            // Optionally, show a confirmation that it was already done
            // showToast.info("X account already linked and mission completed.");
            return true; // Success, already done
          }

          // Success path (first time completion)
          setMissions((prevMissions) =>
            prevMissions.map((mission) =>
              mission.id === missionId
                ? { ...mission, completed: true }
                : mission
            )
          );
          updateCompletedMissions(missionId);

          // Trigger points refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refreshPoints"));
          }

          // Show the success message from the API
          showToast.success(data.message);

          return true;
        } catch (error) {
          showToast.remove(loadingToastId); // Ensure loading toast is removed on catch
          console.error("Error verifying X account:", error);
          showToast.error("Failed to verify X account. Please try again.");
          return false;
        }
      }

      // Special handling for Twitter follow mission
      if (missionId === "follow_x") {
        showToast.loading("Verifying your follow...");

        try {
          if (!authToken) {
            showToast.remove();
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

          if (!response.ok) {
            showToast.remove();
            showToast.error(data.error || "Failed to verify follow status");
            return false;
          }

          // If already completed, just acknowledge it
          if (data.alreadyCompleted) {
            showToast.remove();
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
            window.dispatchEvent(new CustomEvent("refreshPoints"));
          }

          // Get the correct points from the mission data
          const mission = defaultMissions.find((m) => m.id === missionId);
          const pointsAwarded = mission ? mission.points : 0; // Fallback to 0 if mission not found

          // Remove all toasts instantly before showing success
          showToast.remove(); // Consider removing only the loading toast by ID if needed
          showToast.success(
            `Thanks for following! +${pointsAwarded.toLocaleString()} points` // Use points from mission data
          );

          return true;
        } catch (error) {
          showToast.remove();
          console.error("Error verifying Twitter follow:", error);
          showToast.error("Failed to verify follow status. Please try again.");
          return false;
        }
      }

      // Special handling for pool creation verification
      if (missionId === "create_pool") {
        showToast.loading("Verifying pool creation...");

        try {
          if (!authToken) {
            showToast.remove();
            showToast.error(
              "Authentication token not available. Please try again."
            );
            return false;
          }

          // Call the pool verification API endpoint
          const response = await fetch("/api/missions/verify-pool", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            showToast.remove();
            showToast.error(data.error || "Failed to verify pool creation");
            return false;
          }

          // If no pool yet, show message
          if (!data.hasPool) {
            showToast.remove();
            showToast.info(data.message);
            return false;
          }

          // If already completed, just acknowledge it
          if (data.alreadyCompleted) {
            showToast.remove();
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

          // Remove all toasts instantly before showing success
          showToast.remove();
          showToast.success(
            `Pool verified! +${data.points.toLocaleString()} points`
          );

          return true;
        } catch (error) {
          showToast.remove();
          console.error("Error verifying pool creation:", error);
          showToast.error("Failed to verify pool creation. Please try again.");
          return false;
        }
      }

      // Special handling for swap and add liquidity missions
      if (
        missionId === "swap_mon_usdc" ||
        missionId === "swap_shmon" ||
        missionId === "swap_aprmon" ||
        missionId === "swap_gmon" ||
        missionId === "add_liquidity"
      ) {
        showToast.loading(`Verifying ${missionId.replace("_", " ")}...`);

        try {
          if (!authToken) {
            showToast.remove();
            showToast.error(
              "Authentication token not available. Please try again."
            );
            return false;
          }

          // Open a prompt for the user to enter the transaction hash
          const txHash = window.prompt(
            "Please enter the transaction hash to verify:"
          );

          if (!txHash) {
            showToast.remove();
            showToast.info("Transaction verification cancelled");
            return false;
          }

          // Call the verify-swap API endpoint
          const response = await fetch("/api/missions/verify-swap", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              missionId,
              txHash,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            showToast.remove();
            showToast.error(data.error || "Failed to verify transaction");
            return false;
          }

          // If already completed, just acknowledge it
          if (data.alreadyCompleted) {
            showToast.remove();
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
            window.dispatchEvent(new CustomEvent("refreshPoints"));
          }

          // Remove all toasts instantly before showing success
          showToast.remove();
          showToast.success(
            `${missionId.replace(
              "_",
              " "
            )} verified! +${data.points.toLocaleString()} points`
          );

          return true;
        } catch (error) {
          showToast.remove();
          console.error(`Error verifying ${missionId}:`, error);
          showToast.error(
            `Failed to verify ${missionId.replace("_", " ")}. Please try again.`
          );
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
