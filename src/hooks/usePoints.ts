import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { useAuthJwt } from "./useAuthJwt";
import showToast from "../utils/toast";
import {
  formatTimeRemaining,
  checkRecentMissionCompletions,
} from "../lib/services/points-service";
import { useAuthenticatedSupabase } from "./useAuthenticatedSupabase";
import useSWR from "swr";

// Define types locally since we'll only be accessing data through the API
interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface DailyCheckin {
  id: string;
  user_id: string;
  streak_count: number;
  last_checkin_at: string;
  next_available_at: string;
  created_at: string;
}

interface UsePointsReturn {
  points: number | null;
  isLoading: boolean;
  streakCount: number;
  canClaim: boolean;
  timeUntilNextClaim: number;
  formattedTimeRemaining: string;
  claimDailyPoints: () => Promise<void>;
  refreshPoints: () => Promise<void>;
}

// Helper functions
function canClaimDaily(checkin: DailyCheckin | null): boolean {
  if (!checkin) return true;

  const now = new Date();
  const nextAvailable = new Date(checkin.next_available_at);

  return now >= nextAvailable;
}

function getTimeUntilNextClaim(checkin: DailyCheckin | null): number {
  if (!checkin) return 0;

  const now = new Date();
  const nextAvailable = new Date(checkin.next_available_at);

  // Return milliseconds until next available
  return Math.max(0, nextAvailable.getTime() - now.getTime());
}

// Define the fetcher function for SWR
const fetchUserPointsData = async ([url, jwt]: [string, string]) => {
  if (!jwt) {
    throw new Error("No JWT token available");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch points data: ${response.statusText}`);
  }

  return response.json();
};

export function usePoints(
  options: { disableRecentMissionCheck?: boolean } = {}
): UsePointsReturn {
  const { dbUser } = useSupabase();
  const { supabase } = useAuthenticatedSupabase();
  const { token: authJwt, refreshToken } = useAuthJwt();
  const [checkedMission, setCheckedMission] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [cachedPoints, setCachedPoints] = useState<UserPoints | null>(null);
  const [cachedCheckin, setCachedCheckin] = useState<DailyCheckin | null>(null);

  // Get current pathname to check if we're on the onboarding page
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isOnboardingPage = pathname === "/onboarding";

  // Use SWR to fetch and cache points data
  const {
    data: userData,
    error,
    isValidating,
    mutate,
  } = useSWR(
    dbUser && authJwt ? ["/api/points/user-data", authJwt] : null,
    fetchUserPointsData,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Dedupe calls within 5 seconds
      errorRetryCount: 2,
      refreshInterval: 30000, // Refresh every 30 seconds
      keepPreviousData: true, // Keep previous data while revalidating
      onSuccess: (data) => {
        if (data?.points) {
          setCachedPoints(data.points);
        }
        if (data?.checkin) {
          setCachedCheckin(data.checkin);
          const timeMs = getTimeUntilNextClaim(data.checkin);
          setTimeUntilNextClaim(timeMs);
          setTimeRemaining(formatTimeRemaining(timeMs));
        }
      },
    }
  );

  // Extract data from SWR response with fallback to cached values
  const pointsData = userData?.points || cachedPoints || null;
  const checkinData = userData?.checkin || cachedCheckin || null;

  // Derived state - consider request complete even if points is null (new user with no points)
  const points = pointsData?.total_points ?? 0; // Default to 0 instead of null
  const streakCount = checkinData?.streak_count ?? 0;
  const canClaim = canClaimDaily(checkinData);
  // Consider loading complete if we've received any response, even if pointsData is null
  const isLoading = userData === undefined && !error && !cachedPoints;

  // Check for recent mission completions
  useEffect(() => {
    // Skip check if explicitly disabled or we're on the onboarding page
    if (
      !dbUser ||
      !supabase ||
      checkedMission ||
      options.disableRecentMissionCheck ||
      isOnboardingPage
    )
      return;

    const checkMissions = async () => {
      try {
        const recentMission = await checkRecentMissionCompletions(
          supabase,
          dbUser.id
        );

        if (recentMission) {
          // Get descriptive text for the mission
          let missionText = "completing a mission";
          switch (recentMission.missionId) {
            case "link_x":
              missionText = "linking your X account";
              break;
            case "follow_x":
              missionText = "following Stage.fun on X";
              break;
            case "create_pool":
              missionText = "creating your first pool";
              break;
          }

          // Show a toast notification for the earned points
          showToast.success(
            `+${recentMission.points.toLocaleString()} points for ${missionText}!`,
            { duration: 5000 }
          );
        }

        setCheckedMission(true);
      } catch (err) {
        console.error("Error checking mission completions:", err);
      }
    };

    checkMissions();
  }, [
    dbUser,
    supabase,
    checkedMission,
    options.disableRecentMissionCheck,
    isOnboardingPage,
  ]);

  // Update time remaining countdown
  useEffect(() => {
    // Initialize time remaining on first render or when check-in data changes
    if (checkinData) {
      const initialTimeMs = getTimeUntilNextClaim(checkinData);
      setTimeUntilNextClaim(initialTimeMs);
      setTimeRemaining(formatTimeRemaining(initialTimeMs));
    }

    // Set up countdown timer if needed
    if (!canClaim && timeUntilNextClaim > 0) {
      const timer = setInterval(() => {
        setTimeUntilNextClaim((prev) => {
          const newTimeMs = Math.max(0, prev - 1000);

          // Update the formatted time string
          const newFormattedTime = formatTimeRemaining(newTimeMs);
          setTimeRemaining(newFormattedTime);

          // If time expired, refresh data
          if (newTimeMs === 0) {
            mutate();
          }

          return newTimeMs;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [checkinData, canClaim, mutate]);

  // Initial data fetch if not using SWR
  useEffect(() => {
    // If we don't have points data yet but we have user and jwt, fetch manually once
    if (!pointsData && dbUser && authJwt && !isValidating && !error) {
      const fetchInitialData = async () => {
        try {
          const initialData = await fetchUserPointsData([
            "/api/points/user-data",
            authJwt,
          ]);
          if (initialData?.points) {
            setCachedPoints(initialData.points);
          }
          if (initialData?.checkin) {
            setCachedCheckin(initialData.checkin);
          }
        } catch (err) {
          console.error("Error fetching initial points data:", err);
        }
      };

      fetchInitialData();
    }
  }, [dbUser, authJwt, pointsData, isValidating, error]);

  // Function to claim daily points using the secure API endpoint
  const claimDailyPoints = useCallback(async () => {
    if (!dbUser) {
      showToast.error("You must be logged in to claim points");
      return;
    }

    if (!canClaim) {
      showToast.error(`You can claim again in ${timeRemaining}`);
      return;
    }

    try {
      const loadingId = showToast.loading("Claiming your daily points...");

      // Get JWT token for API call
      let jwt = authJwt;
      if (!jwt) {
        jwt = await refreshToken();
      }

      if (!jwt) {
        showToast.error("Authentication error. Please try again.", {
          id: loadingId,
        });
        return;
      }

      // Call the secure API endpoint
      const response = await fetch("/api/points/daily-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast.success(
          `You earned ${result.points} points! Streak: ${result.newStreak} days`,
          { id: loadingId }
        );

        // Refresh data
        await mutate();
      } else {
        showToast.error(
          result.message || result.error || "Failed to claim points",
          { id: loadingId }
        );
      }
    } catch (error) {
      console.error("Error claiming daily points:", error);
      showToast.error("Something went wrong. Please try again.");
    }
  }, [dbUser, canClaim, timeRemaining, authJwt, refreshToken, mutate]);

  // Function to refresh points data
  const refreshPoints = useCallback(async () => {
    try {
      await mutate();
    } catch (error) {
      console.error("Error refreshing points data:", error);
    }
  }, [mutate]);

  // Listen for refresh points event
  useEffect(() => {
    const handleRefreshPoints = () => {
      refreshPoints();
    };

    // Add event listener
    if (typeof window !== "undefined") {
      window.addEventListener("refreshPoints", handleRefreshPoints);
    }

    // Clean up
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("refreshPoints", handleRefreshPoints);
      }
    };
  }, [refreshPoints]);

  return {
    points,
    isLoading,
    streakCount,
    canClaim,
    timeUntilNextClaim,
    formattedTimeRemaining: timeRemaining,
    claimDailyPoints,
    refreshPoints,
  };
}
