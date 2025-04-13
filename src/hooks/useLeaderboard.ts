import useSWR from "swr";
import { useSupabase } from "../contexts/SupabaseContext";
import { useAuthJwt } from "./useAuthJwt";

export interface LeaderboardUser {
  id: string;
  name: string | null;
  wallet: string | null;
  avatar_url: string | null;
  points: number;
  raisedAmount: number;
  realizedPnl: number;
  usdcScore: number;
  totalTally: number;
  isCurrentUser: boolean;
}

/**
 * Hook to fetch leaderboard data
 */
export function useLeaderboard(season: "current" | "pre-season" = "current") {
  const { dbUser } = useSupabase();
  const { token: authJwt } = useAuthJwt();

  const { data, error, isLoading, mutate } = useSWR(
    authJwt ? [`/api/leaderboard?season=${season}`, authJwt] : null,
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
      return data.users.map((user: LeaderboardUser) => ({
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

  return {
    users: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
