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
        points_awarded: true,
        completed_at: new Date().toISOString(),
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

    // Award points using the points service
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

    return NextResponse.json({
      alreadyCompleted: false,
      message: `Mission completed! You've earned ${pointsToAward} points.`,
    });
  } catch (error) {
    console.error("Error verifying Twitter mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
