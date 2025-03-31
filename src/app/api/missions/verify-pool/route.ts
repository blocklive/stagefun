import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { userId } = authResult;

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

    // Record mission completion
    const { error: completionError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "create_pool",
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    // Award points
    const pointsAmount = 5000;

    // Update user's points
    const { data: userPoints, error: pointsCheckError } = await adminClient
      .from("user_points")
      .select("id, total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (pointsCheckError) {
      console.error("Error checking points:", pointsCheckError);
    }

    if (userPoints) {
      await adminClient
        .from("user_points")
        .update({
          total_points: (userPoints.total_points as number) + pointsAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await adminClient.from("user_points").insert({
        user_id: userId,
        total_points: pointsAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Record the points transaction
    await adminClient.from("point_transactions").insert({
      user_id: userId,
      amount: pointsAmount,
      action_type: "create_pool",
      metadata: {
        mission_id: "create_pool",
      },
    });

    return NextResponse.json({
      hasPool: true,
      alreadyCompleted: false,
      points: pointsAmount,
      message: "Congratulations! You've completed the Create Pool mission!",
    });
  } catch (error) {
    console.error("Error in verify pool:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
