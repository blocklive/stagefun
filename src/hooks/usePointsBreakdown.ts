import { useState, useEffect } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { useAuthJwt } from "./useAuthJwt";
import useSWR from "swr";

interface PointsBreakdown {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  breakdown: {
    funded: { base: number; bonus: number; total: number };
    raised: { base: number; bonus: number; total: number };
    onboarding: { base: number; bonus: number; total: number };
    checkin: { base: number; bonus: number; total: number };
  };
}

// Fetcher function for SWR
const fetchPointsBreakdown = async ([url, jwt]: [string, string]) => {
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
    throw new Error(`Failed to fetch points breakdown: ${response.statusText}`);
  }

  return response.json();
};

export function usePointsBreakdown(): {
  breakdown: PointsBreakdown | null;
  isLoading: boolean;
  error: any;
  refresh: () => void;
} {
  const { dbUser } = useSupabase();
  const { token: authJwt } = useAuthJwt();

  // Use SWR to fetch and cache points breakdown data
  const {
    data: breakdownData,
    error,
    isValidating,
    mutate,
  } = useSWR(
    dbUser && authJwt ? ["/api/points/breakdown", authJwt] : null,
    fetchPointsBreakdown,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Dedupe calls within 10 seconds
      errorRetryCount: 2,
      refreshInterval: 60000, // Refresh every minute
      keepPreviousData: true,
    }
  );

  return {
    breakdown: breakdownData || null,
    isLoading: !breakdownData && !error,
    error,
    refresh: mutate,
  };
}
