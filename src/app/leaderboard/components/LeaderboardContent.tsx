"use client";

import { useState } from "react";
import useSWR from "swr";
import LeaderboardTable from "./LeaderboardTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuthJwt } from "@/hooks/useAuthJwt";

export default function LeaderboardContent() {
  const { dbUser } = useSupabase();
  const { token: authJwt } = useAuthJwt();

  // Use SWR to fetch leaderboard data (only for Season 1)
  const {
    data: users,
    error,
    isLoading,
  } = useSWR(
    authJwt ? [`/api/leaderboard?season=current`, authJwt] : null,
    async ([url, jwt]) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard data");
      }

      const data = await response.json();

      // Add isCurrentUser flag to identify the current user
      return data.users.map((user: any) => ({
        ...user,
        isCurrentUser: dbUser && user.id === dbUser.id,
      }));
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      dedupingInterval: 10000, // Dedupe calls within 10 seconds
    }
  );

  if (error) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-red-500">Failed to load leaderboard data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Season 1</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-60">
          <LoadingSpinner color="#836EF9" size={40} />
        </div>
      ) : (
        <LeaderboardTable users={users || []} />
      )}
    </div>
  );
}
