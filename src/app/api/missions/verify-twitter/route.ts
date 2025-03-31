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
    const adminClient = getSupabaseAdmin();

    // Check if the mission has already been completed
    const { data: existingMission, error: missionError } = await adminClient
      .from("user_completed_missions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_id", "link_x")
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
        isLinked: true,
        alreadyCompleted: true,
      });
    }

    // Check if user has a Twitter username in their profile
    const { data: user, error: userError } = await adminClient
      .from("users")
      .select("twitter_username")
      .eq("id", userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "Failed to check user profile" },
        { status: 500 }
      );
    }

    if (!user?.twitter_username) {
      return NextResponse.json({
        isLinked: false,
        message:
          "Please log in with your Twitter account to complete this mission.",
      });
    }

    // Record mission completion
    const { error: completionError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "link_x",
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    // Award points
    const pointsAmount = 1000;

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
      action_type: "link_x",
      metadata: {
        mission_id: "link_x",
      },
    });

    return NextResponse.json({
      isLinked: true,
      alreadyCompleted: false,
      points: pointsAmount,
      message: "X account verified! Thanks for connecting!",
    });
  } catch (error) {
    console.error("Error in verify Twitter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
