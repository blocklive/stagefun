import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

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

    // Create an admin client with service role permissions
    const adminClient = getSupabaseAdmin();

    // Check if the mission has already been completed first
    const { data: existingMission, error: missionError } = await adminClient
      .from("user_completed_missions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_id", "create_pool")
      .maybeSingle();

    if (missionError) {
      return NextResponse.json(
        { error: "Failed to check mission status" },
        { status: 500 }
      );
    }

    // If already completed, return success
    if (existingMission) {
      return NextResponse.json({
        hasPool: true,
        alreadyCompleted: true,
        message: "You've already completed this mission!",
      });
    }

    // Check if user has created any pools
    const { data: pools, error: poolError } = await adminClient
      .from("pools")
      .select("id")
      .eq("creator_id", userId)
      .limit(1);

    if (poolError) {
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

    // Insert the completed mission
    const { error: insertError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "create_pool",
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    // Award points for completing the mission
    const { error: pointsError } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount: 100,
        action_type: "mission_completed",
        metadata: {
          mission_id: "create_pool",
          reason: "Created first pool",
        },
      });

    if (pointsError) {
      return NextResponse.json(
        { error: "Failed to award points" },
        { status: 500 }
      );
    }

    // Update total points
    const { error: updateError } = await adminClient.rpc("update_user_points", {
      p_user_id: userId,
      p_points: 100,
    });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update total points" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasPool: true,
      alreadyCompleted: false,
      message: "Mission completed! You've earned 100 points.",
    });
  } catch (error) {
    console.error("Error verifying pool mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
