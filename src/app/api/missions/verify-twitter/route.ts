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
    const missionId = "link_x";

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

    // Check if the mission has already been completed first
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

    // If already completed, return success
    if (existingMission) {
      return NextResponse.json({
        alreadyCompleted: true,
        message: "You've already completed this mission!",
      });
    }

    // Simplified logic: If the user is authenticated via Privy (which now requires X),
    // we assume the X account is linked. No need for the extra DB check.

    // Insert the completed mission
    const { error: insertError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: missionId,
      });

    if (insertError) {
      console.error("Error recording mission completion:", insertError);
      // Handle potential unique constraint violation gracefully
      if (insertError.code === "23505") {
        // unique_violation
        return NextResponse.json({
          alreadyCompleted: true,
          message: "Mission already completed.",
        });
      }
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
        amount: pointsToAward,
        action_type: "mission_completed",
        metadata: {
          mission_id: missionId,
          reason: "Linked X account",
        },
      });

    if (pointsError) {
      console.error("Error awarding points transaction:", pointsError);
      // Note: Consider if we should roll back the mission completion here
      return NextResponse.json(
        { error: "Failed to award points" },
        { status: 500 }
      );
    }

    // Fetch current points first
    const { data: userPointsData, error: fetchPointsError } = await adminClient
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchPointsError) {
      console.error("Error fetching user points:", fetchPointsError);
      // Note: Points awarded, but total might be incorrect. Log or handle as needed.
      return NextResponse.json(
        { error: "Failed to fetch points for update" },
        { status: 500 }
      );
    }

    // Ensure currentPoints is treated as a number
    const currentPoints = Number(userPointsData?.total_points || 0);
    const newTotalPoints = currentPoints + pointsToAward;

    // Upsert the new total points
    const { error: updateError } = await adminClient
      .from("user_points")
      .upsert(
        { user_id: userId, total_points: newTotalPoints },
        { onConflict: "user_id" }
      );

    if (updateError) {
      // Log the specific error for better debugging
      console.error("Error updating total points directly:", updateError);
      // Note: Points transaction recorded, but total points update failed.
      // Consider alerting or queuing for retry.
      return NextResponse.json(
        { error: "Failed to update total points balance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alreadyCompleted: false,
      message: `Mission completed! You've earned ${pointsToAward} points.`, // Dynamic points in message
    });
  } catch (error) {
    console.error("Error verifying Twitter mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
