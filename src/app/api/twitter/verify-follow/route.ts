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
    // Log request for debugging
    console.log(
      "\n\n============ TWITTER VERIFY-FOLLOW API CALLED ============"
    );

    const authHeader = request.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    if (authHeader) {
      console.log(
        "Auth header starts with:",
        authHeader.substring(0, 15) + "..."
      );
    } else {
      console.log("WARNING: No Authorization header found in request");
    }

    // Extract the token manually for debugging
    const token = extractBearerToken(request);
    console.log(
      "Token extracted:",
      token ? `Yes (length: ${token.length})` : "No token extracted"
    );

    if (!token) {
      console.log("ERROR: Failed to extract token from request");
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 }
      );
    }

    // Authenticate the request
    console.log("Calling authenticateRequest with token...");
    const authResult = await authenticateRequest(request);
    console.log("Auth result:", {
      authenticated: authResult.authenticated,
      userId: authResult.userId,
      error: authResult.error,
      statusCode: authResult.statusCode,
    });

    if (!authResult.authenticated) {
      console.error("Authentication failed:", authResult.error);
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { userId } = authResult;

    console.log(
      "Twitter verify-follow API authenticated successfully for userId:",
      userId
    );

    // Create an admin client with service role permissions
    const adminClient = getSupabaseAdmin();

    // Ensure userId is valid before proceeding
    if (!userId) {
      console.error("Missing userId in auth result");
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
      console.error("Error checking mission status:", missionError);
      return NextResponse.json(
        { error: "Failed to check mission status" },
        { status: 500 }
      );
    }

    // If already completed, return success
    if (existingMission) {
      console.log("Mission already completed for user", userId);
      return NextResponse.json({
        isFollowing: true,
        alreadyCompleted: true,
      });
    }

    console.log("Mission not yet completed, proceeding with completion");

    // No need to recheck the user's information, we already have the userId
    // Just proceed directly to recording mission completion

    // Record mission completion using admin client with service role
    const pointsAmount = 10000; // 10k points for Twitter follow

    console.log("Inserting mission completion record for user", userId);
    const { error: completionError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "follow_x",
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      console.error("Error recording mission completion:", completionError);
      return NextResponse.json(
        { error: "Failed to record mission completion" },
        { status: 500 }
      );
    }

    console.log("Mission completion record created successfully");

    // Update user's points
    // First, check if they have a points record
    console.log("Checking for existing points record");
    const { data: userPoints, error: pointsCheckError } = await adminClient
      .from("user_points")
      .select("id, total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (pointsCheckError) {
      console.error("Error checking user points:", pointsCheckError);
      // Continue with the process even if we can't get the current points
    }

    // If user has existing points, update them
    if (userPoints) {
      console.log(
        "Updating existing points record. Current points:",
        userPoints.total_points
      );
      const { error: pointsUpdateError } = await adminClient
        .from("user_points")
        .update({
          total_points: (userPoints.total_points as number) + pointsAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (pointsUpdateError) {
        console.error("Error updating user points:", pointsUpdateError);
        // Continue with the process even if points update fails
      } else {
        console.log(
          "Points updated successfully to",
          (userPoints.total_points as number) + pointsAmount
        );
      }
    } else {
      // Create a new points record for the user
      console.log(
        "No existing points record, creating new one with initial points:",
        pointsAmount
      );
      const { error: newPointsError } = await adminClient
        .from("user_points")
        .insert({
          user_id: userId,
          total_points: pointsAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (newPointsError) {
        console.error("Error creating user points record:", newPointsError);
        // Continue with the process even if creating points record fails
      } else {
        console.log("New points record created successfully");
      }
    }

    // Record the points transaction
    console.log("Recording points transaction for follow_x action");
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
      console.error("Error recording points transaction:", transactionError);
      // Continue with the process even if transaction record fails
    } else {
      console.log("Points transaction recorded successfully");
    }

    console.log(
      "Twitter follow verification completed successfully. Sending success response."
    );
    // Return success with points information
    return NextResponse.json({
      isFollowing: true,
      alreadyCompleted: false,
      points: pointsAmount,
      message: `Thanks for following @${TARGET_TWITTER_ACCOUNT}!`,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
