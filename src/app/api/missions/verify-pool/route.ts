import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";
import { onboardingMissions } from "@/app/data/onboarding-missions"; // Import mission data
import { awardPoints, PointType } from "@/lib/services/points.service";

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
        points_awarded: true,
        completed_at: new Date().toISOString(),
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

    // --- 4. Award points using the points service ---
    const pointsResult = await awardPoints({
      userId,
      type: PointType.ONBOARDING,
      amount: pointsToAward,
      description: `Completed mission: ${missionId}`,
      metadata: {
        missionId,
        completedAt: new Date().toISOString(),
      },
      supabase: adminClient,
    });

    if (!pointsResult.success) {
      console.error("Error awarding points:", pointsResult.error);
      return NextResponse.json(
        { error: "Failed to award points" },
        { status: 500 }
      );
    }

    // Return response with all necessary fields including points
    return NextResponse.json({
      hasPool: true,
      alreadyCompleted: false,
      message: `Mission completed! You've earned ${pointsToAward} points.`,
      points: pointsToAward,
    });
  } catch (error) {
    console.error("Error verifying pool mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
