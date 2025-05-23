import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getSupabaseAdmin,
  extractBearerToken,
} from "@/lib/auth/server";
import { onboardingMissions } from "@/app/data/onboarding-missions"; // Import mission data
import { awardPoints, PointType } from "@/lib/services/points.service";

// The Twitter username we want users to follow
const TARGET_TWITTER_ACCOUNT = "stagedotfun";

// TODO: Replace with actual Twitter API client and logic
async function checkTwitterFollow(userId: string): Promise<boolean> {
  // Placeholder: Assume follow is verified for now
  // In reality, this would involve checking Twitter API using stored credentials
  console.log(`Placeholder: Verifying Twitter follow for user ${userId}`);
  return true;
}

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

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const missionId = "follow_x";

    // Get points dynamically from mission data
    const mission = onboardingMissions.find((m) => m.id === missionId);
    if (!mission) {
      console.error(`Mission data not found for ID: ${missionId}`);
      return NextResponse.json(
        { error: "Mission configuration error" },
        { status: 500 }
      );
    }
    const pointsToAward = mission.points; // Use points from data file (should be 1000)

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
        alreadyCompleted: true,
        message: "You've already completed this mission!",
      });
    }

    // --- 2. Verify the Twitter Follow (Placeholder) ---
    // TODO: Implement actual Twitter API check here
    const isFollowing = await checkTwitterFollow(userId);
    if (!isFollowing) {
      return NextResponse.json(
        {
          error:
            "Verification failed: Please ensure you are following the account.",
        },
        { status: 400 }
      );
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

    return NextResponse.json({
      alreadyCompleted: false,
      isFollowing: true,
      message: `Thanks for following! You've earned ${pointsToAward} points.`, // Use dynamic points
    });
  } catch (error) {
    console.error("Error verifying Twitter follow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
