import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";
import { onboardingMissions } from "@/app/data/onboarding-missions"; // Import mission data

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const missionId = "create_pool";

    // Get points dynamically from mission data
    const mission = onboardingMissions.find((m) => m.id === missionId);
    if (!mission) {
      console.error(`Mission data not found for ID: ${missionId}`);
      return NextResponse.json(
        { error: "Mission configuration error" },
        { status: 500 }
      );
    }
    const pointsToAward = mission.points;

    // Create an admin client with service role permissions
    const adminClient = getSupabaseAdmin();

    // --- 1. Check if mission already completed ---
    const { data: existingMission, error: missionError } = await adminClient
      .from("user_completed_missions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .maybeSingle();

    if (missionError) {
      console.error("Error checking mission status:", missionError);
      return NextResponse.json(
        { error: "Failed to check mission status" },
        { status: 500 }
      );
    }

    if (existingMission) {
      return NextResponse.json({
        hasPool: true, // Assume if mission completed, they have a pool
        alreadyCompleted: true,
        message: "You've already completed this mission!",
      });
    }

    // --- 2. Check if user has created any pools ---
    const { data: pools, error: poolError } = await adminClient
      .from("pools")
      .select("id")
      .eq("creator_id", userId)
      .limit(1);

    if (poolError) {
      console.error("Error checking pool status:", poolError);
      return NextResponse.json(
        { error: "Failed to check pool status" },
        { status: 500 }
      );
    }

    const hasPool = pools && pools.length > 0;

    if (!hasPool) {
      return NextResponse.json({
        hasPool: false,
        message:
          "You haven't created a pool yet. Create one to complete this mission!",
      });
    }

    // --- 3. Record mission completion ---
    const { error: insertError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: missionId,
      });

    if (insertError) {
      console.error("Error recording mission completion:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json({
          hasPool: true,
          alreadyCompleted: true,
          message: "Mission already completed.",
        });
      }
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    // --- 4. Award points transaction ---
    const { error: pointsError } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount: pointsToAward,
        action_type: "mission_completed",
        metadata: {
          mission_id: missionId,
          reason: "Created first pool",
        },
      });

    if (pointsError) {
      console.error("Error awarding points transaction:", pointsError);
      // Note: Consider rollback
      return NextResponse.json(
        { error: "Failed to award points" },
        { status: 500 }
      );
    }

    // --- 5. Update total points directly in user_points table ---
    const { data: userPointsData, error: fetchPointsError } = await adminClient
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchPointsError) {
      console.error("Error fetching user points:", fetchPointsError);
      return NextResponse.json(
        { error: "Failed to fetch points for update" },
        { status: 500 }
      );
    }

    const currentPoints = Number(userPointsData?.total_points || 0);
    const newTotalPoints = currentPoints + pointsToAward;

    const { error: updateError } = await adminClient
      .from("user_points")
      .upsert(
        { user_id: userId, total_points: newTotalPoints },
        { onConflict: "user_id" }
      );

    if (updateError) {
      console.error("Error updating total points directly:", updateError);
      // Note: Consider alerting
      return NextResponse.json(
        { error: "Failed to update total points balance" },
        { status: 500 }
      );
    }

    // Return response with all necessary fields including points
    return NextResponse.json({
      hasPool: true,
      alreadyCompleted: false,
      message: `Mission completed! You've earned ${pointsToAward} points.`, // Dynamic points
      points: pointsToAward, // Add this field explicitly for the client
    });
  } catch (error) {
    console.error("Error verifying pool mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
