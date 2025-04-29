import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { fromUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";

// Define types locally to avoid circular dependencies
interface LeaderboardUserData {
  id: string;
  name: string | null;
  wallet: string | null;
  avatar_url: string | null;
  points: {
    total: number;
    funded: number;
    raised: number;
    onboarding: number;
    checkin: number;
  };
  fundedAmount: number;
  raisedAmount: number;
  totalTally: number;
}

// Database types
interface DbUserPoints {
  funded_points: number;
  raised_points: number;
  onboarding_points: number;
  checkin_points: number;
}

interface DbUser {
  id: string;
  name: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
  funded_amount: string | null;
  user_points: DbUserPoints;
}

// List of core team members to exclude from leaderboard
const EXCLUDED_USERS = ["spatializes", "stagedotfun", "4ormund"];

export async function GET(request: NextRequest) {
  try {
    // Get the season from query params
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || "current";

    // Get admin client
    const supabase = getSupabaseAdmin();

    // SQL query for leaderboard
    const query = supabase
      .from("users")
      .select(
        `
        id,
        name,
        wallet_address,
        avatar_url,
        funded_amount,
        user_points!inner (
          funded_points,
          raised_points,
          onboarding_points,
          checkin_points,
          total_points
        )
      `
      )
      // Exclude core team members - filter by name
      .neq("name", "spatializes")
      .neq("name", "stagedotfun")
      .neq("name", "4ormund")
      // Order by total_points in the user_points table in descending order
      // Use the correct syntax for ordering by a foreign table column
      .order("user_points(total_points)", { ascending: false })
      // Then limit to top 100
      .limit(100);

    const { data: usersResult, error } = await query;

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    // Cast to a more specific type
    const users = usersResult as unknown as DbUser[];

    // For each user, get the total amount raised in their pools
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Get total raised for pools created by this user
        const { data: poolsData, error: poolsError } = await supabase
          .from("pools")
          .select("raised_amount")
          .eq("creator_id", user.id);

        if (poolsError) {
          console.error("Error fetching user pools:", poolsError);
          return {
            id: user.id,
            name: user.name,
            wallet: user.wallet_address,
            avatar_url: user.avatar_url,
            points: {
              total:
                (user.user_points.funded_points || 0) +
                (user.user_points.raised_points || 0) +
                (user.user_points.onboarding_points || 0) +
                (user.user_points.checkin_points || 0),
              funded: user.user_points.funded_points || 0,
              raised: user.user_points.raised_points || 0,
              onboarding: user.user_points.onboarding_points || 0,
              checkin: user.user_points.checkin_points || 0,
            },
            fundedAmount: 0,
            raisedAmount: 0,
            // Just use points for totalTally - no dollar amounts
            totalTally:
              (user.user_points.funded_points || 0) +
              (user.user_points.raised_points || 0) +
              (user.user_points.onboarding_points || 0) +
              (user.user_points.checkin_points || 0),
          };
        }

        // Sum all raised amounts from user's pools
        const raisedAmount = poolsData.reduce((sum, pool) => {
          // Convert from base units to display amounts
          const amount = pool.raised_amount
            ? fromUSDCBaseUnits(BigInt(pool.raised_amount.toString()))
            : 0;
          return sum + amount;
        }, 0);

        // Convert funded amount from base units to display amount
        const fundedAmount = user.funded_amount
          ? fromUSDCBaseUnits(BigInt(user.funded_amount))
          : 0;

        // Calculate total points - sum of all point categories
        const totalPoints =
          (user.user_points.funded_points || 0) +
          (user.user_points.raised_points || 0) +
          (user.user_points.onboarding_points || 0) +
          (user.user_points.checkin_points || 0);

        return {
          id: user.id,
          name: user.name,
          wallet: user.wallet_address,
          avatar_url: user.avatar_url,
          points: {
            total: totalPoints,
            funded: user.user_points.funded_points || 0,
            raised: user.user_points.raised_points || 0,
            onboarding: user.user_points.onboarding_points || 0,
            checkin: user.user_points.checkin_points || 0,
          },
          fundedAmount: fundedAmount,
          raisedAmount: raisedAmount,
          // Use just the total points for ranking
          totalTally: totalPoints,
        };
      })
    );

    // Sort by total points descending
    enrichedUsers.sort((a, b) => b.points.total - a.points.total);

    // Apply proper competition ranking (1,2,2,4 style)
    let currentRank = 1;
    let currentScore =
      enrichedUsers.length > 0 ? enrichedUsers[0].points.total : 0;
    let sameRankCount = 0;

    // Assign ranks with proper competition ranking
    const rankedUsers = enrichedUsers.map((user, index) => {
      if (index === 0) {
        // First user always gets rank 1
        sameRankCount = 1;
        return { ...user, rank: currentRank };
      }

      if (user.points.total === currentScore) {
        // Same score as previous user, keep same rank
        sameRankCount++;
        return { ...user, rank: currentRank };
      } else {
        // Different score, update rank and current score
        currentRank += sameRankCount;
        currentScore = user.points.total;
        sameRankCount = 1;
        return { ...user, rank: currentRank };
      }
    });

    return NextResponse.json({
      users: rankedUsers,
      season: season,
    });
  } catch (error) {
    console.error("Error in leaderboard API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
