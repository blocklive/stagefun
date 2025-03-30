import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { useAuthJwt } from "./useAuthJwt";
import showToast from "../utils/toast";
import { formatTimeRemaining } from "../lib/services/points-service";

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

export function usePoints(): UsePointsReturn {
  const { dbUser } = useSupabase();
  const { token: authJwt, refreshToken } = useAuthJwt();
  const [pointsData, setPointsData] = useState<UserPoints | null>(null);
  const [checkinData, setCheckinData] = useState<DailyCheckin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Derived state
  const points = pointsData?.total_points ?? null;
  const streakCount = checkinData?.streak_count ?? 0;
  const canClaim = canClaimDaily(checkinData);

  // Fetch points and check-in data
  const fetchData = useCallback(async () => {
    if (!dbUser) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get JWT token for API call
      let jwt = authJwt;
      if (!jwt) {
        jwt = await refreshToken();
      }

      if (!jwt) {
        console.error("Failed to get auth token");
        setIsLoading(false);
        return;
      }

      // Fetch user points data
      const response = await fetch("/api/points/user-data", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch points data:", response.statusText);
        setIsLoading(false);
        return;
      }

      const userData = await response.json();

      setPointsData(userData.points || null);
      setCheckinData(userData.checkin || null);

      // Calculate time until next claim
      if (userData.checkin) {
        const timeMs = getTimeUntilNextClaim(userData.checkin);
        setTimeUntilNextClaim(timeMs);
        setTimeRemaining(formatTimeRemaining(timeMs));
      }
    } catch (error) {
      console.error("Error loading points data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, authJwt, refreshToken]);

  // Update time remaining countdown
  useEffect(() => {
    if (!canClaim && timeUntilNextClaim > 0) {
      const timer = setInterval(() => {
        const newTimeMs = Math.max(0, timeUntilNextClaim - 1000);
        setTimeUntilNextClaim(newTimeMs);
        setTimeRemaining(formatTimeRemaining(newTimeMs));

        // If time expired, refresh data
        if (newTimeMs === 0) {
          fetchData();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeUntilNextClaim, canClaim, fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        await fetchData();
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
  }, [dbUser, canClaim, timeRemaining, fetchData, authJwt, refreshToken]);

  return {
    points,
    isLoading,
    streakCount,
    canClaim,
    timeUntilNextClaim,
    formattedTimeRemaining: timeRemaining,
    claimDailyPoints,
    refreshPoints: fetchData,
  };
}
