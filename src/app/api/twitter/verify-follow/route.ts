import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getSupabaseAdmin,
  extractBearerToken,
} from "@/lib/auth/server";

// The Twitter username we want users to follow
const TARGET_TWITTER_ACCOUNT = "stagedotfun";

export async function POST(request: NextRequest) {
  try {
    // Extract the token manually for debugging
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 }
      );
    }

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

    // Ensure userId is valid before proceeding
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid user authentication" },
        { status: 401 }
      );
    }

    // Check if the mission has already been completed first
    const { data: existingMission, error: missionError } = await adminClient
      .from("user_completed_missions")
      .select("id")
      .eq("user_id", userId)
      .eq("mission_id", "follow_x")
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
        isFollowing: true,
        alreadyCompleted: true,
      });
    }

    // Record mission completion using admin client with service role
    const pointsAmount = 10000; // 10k points for Twitter follow

    const { error: completionError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "follow_x",
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    // Update user's points
    // First, check if they have a points record
    const { data: userPoints, error: pointsCheckError } = await adminClient
      .from("user_points")
      .select("id, total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (pointsCheckError) {
      // Continue with the process even if we can't get the current points
    }

    // If user has existing points, update them
    if (userPoints) {
      const { error: pointsUpdateError } = await adminClient
        .from("user_points")
        .update({
          total_points: (userPoints.total_points as number) + pointsAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (pointsUpdateError) {
        // Continue with the process even if points update fails
      }
    } else {
      // Create a new points record for the user
      const { error: newPointsError } = await adminClient
        .from("user_points")
        .insert({
          user_id: userId,
          total_points: pointsAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (newPointsError) {
        // Continue with the process even if creating points record fails
      }
    }

    // Record the points transaction
    const { error: transactionError } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount: pointsAmount,
        action_type: "follow_x",
        metadata: {
          mission_id: "follow_x",
          account: TARGET_TWITTER_ACCOUNT,
        },
      });

    if (transactionError) {
      // Continue with the process even if transaction record fails
    }

    return NextResponse.json({
      isFollowing: true,
      alreadyCompleted: false,
      points: pointsAmount,
      message: `Thanks for following @${TARGET_TWITTER_ACCOUNT}!`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
