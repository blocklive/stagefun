"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import LeaderboardTable from "./LeaderboardTable";
import LeaderboardSkeleton from "./LeaderboardSkeleton";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import { usePrivy } from "@privy-io/react-auth";

export default function LeaderboardContent() {
  const { dbUser } = useSupabase();
  const { token: authJwt } = useAuthJwt();
  const { user: privyUser } = usePrivy();
  const [displayUsers, setDisplayUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use SWR to fetch leaderboard data (only for Season 1)
  const {
    data: users,
    error,
    isLoading: swrLoading,
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

      // We'll process the data in the useEffect
      return data.users;
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      dedupingInterval: 10000, // Dedupe calls within 10 seconds
    }
  );

  // Process users data and ensure current user is at the top
  useEffect(() => {
    if (!users || !privyUser) return;

    // For debugging
    console.log("Processing users data, total users:", users.length);

    // Get user wallet address from Privy (faster comparison)
    const userWallet = privyUser.wallet?.address?.toLowerCase();
    const userDbId = dbUser?.id;

    // Ensure all users have properly structured points objects
    const sanitizedUsers = users.map((user: any) => {
      // Make sure points is a proper object
      const points =
        typeof user.points === "object" && user.points
          ? user.points
          : {
              total: 0,
              funded: 0,
              raised: 0,
              onboarding: 0,
              checkin: 0,
            };

      return {
        ...user,
        points: {
          total: points.total || 0,
          funded: points.funded || 0,
          raised: points.raised || 0,
          onboarding: points.onboarding || 0,
          checkin: points.checkin || 0,
        },
      };
    });

    // Find current user by wallet or ID
    const currentUser = sanitizedUsers.find(
      (user: any) =>
        (userWallet && user.wallet?.toLowerCase() === userWallet) ||
        (userDbId && user.id === userDbId)
    );

    // Flag current user
    const processedUsers = sanitizedUsers.map((user: any) => ({
      ...user,
      isCurrentUser: currentUser && user.id === currentUser.id,
    }));

    if (currentUser) {
      console.log("Current user found:", currentUser.name || currentUser.id);

      // Make copy of current user and set flag
      const currentUserWithFlag = {
        ...currentUser,
        isCurrentUser: true,
      };

      // Filter out current user from the list
      const otherUsers = processedUsers.filter(
        (user: any) => !user.isCurrentUser
      );

      // Create a new array with current user at top
      const sortedUsers = [currentUserWithFlag, ...otherUsers];

      // Debug check
      console.log(
        "First user in list:",
        sortedUsers[0].id,
        "isCurrentUser:",
        sortedUsers[0].isCurrentUser
      );

      setDisplayUsers(sortedUsers);
    } else {
      console.log("Current user not found in leaderboard data");
      setDisplayUsers(processedUsers);
    }

    setLoading(false);
  }, [users, privyUser, dbUser]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Season 1</h2>
      </div>

      {swrLoading || loading || error ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardTable users={displayUsers} />
      )}
    </div>
  );
}
