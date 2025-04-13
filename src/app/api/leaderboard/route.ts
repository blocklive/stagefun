import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { fromUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";

// Define types locally to avoid circular dependencies
interface LeaderboardUserData {
  id: string;
  name: string | null;
  wallet: string | null;
  avatar_url: string | null;
  points: number;
  fundedAmount: number;
  raisedAmount: number;
  totalTally: number;
}

// Database types
interface DbUserPoints {
  total_points: number;
}

interface DbUser {
  id: string;
  name: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
  funded_amount: string | null;
  user_points: DbUserPoints;
}

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
          total_points
        )
      `
      )
      // Join inner to filter out users without points
      .order("user_points(total_points)", { ascending: false })
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
            points: user.user_points.total_points,
            fundedAmount: 0,
            raisedAmount: 0,
            totalTally: user.user_points.total_points, // For now just use points
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

        // Calculate total tally
        const totalTally =
          user.user_points.total_points + fundedAmount + raisedAmount;

        return {
          id: user.id,
          name: user.name,
          wallet: user.wallet_address,
          avatar_url: user.avatar_url,
          points: user.user_points.total_points,
          fundedAmount: fundedAmount,
          raisedAmount: raisedAmount,
          totalTally: totalTally,
        };
      })
    );

    // First sort by total tally descending
    enrichedUsers.sort((a, b) => b.totalTally - a.totalTally);

    // Apply proper competition ranking (1,2,2,4 style)
    let currentRank = 1;
    let currentScore =
      enrichedUsers.length > 0 ? enrichedUsers[0].totalTally : 0;
    let sameRankCount = 0;

    // Assign ranks with proper competition ranking
    const rankedUsers = enrichedUsers.map((user, index) => {
      if (index === 0) {
        // First user always gets rank 1
        sameRankCount = 1;
        return { ...user, rank: currentRank };
      }

      if (user.totalTally === currentScore) {
        // Same score as previous user, keep same rank
        sameRankCount++;
        return { ...user, rank: currentRank };
      } else {
        // Different score, update rank and current score
        currentRank += sameRankCount;
        currentScore = user.totalTally;
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
