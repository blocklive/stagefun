import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth/server";
import { awardPoints, PointType } from "@/lib/services/points.service";

// Map of mission IDs to point values
const MISSION_POINTS: Record<string, number> = {
  link_x: 10000,
  follow_x: 10000,
  create_pool: 50000,
  swap_mon_usdc: 1000,
  swap_shmon: 1000,
  swap_aprmon: 1000,
  swap_gmon: 1000,
  swap_jerry: 1000,
  add_liquidity: 2000,
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request using Privy JWT
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId as string;

    // Ensure userId is defined
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in authentication" },
        { status: 400 }
      );
    }

    console.log("Award mission API called for user:", userId);

    // Parse request body
    const body = await request.json();
    const { missionId } = body;

    if (!missionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Mission ID is required" },
        { status: 400 }
      );
    }

    // Get point value for the mission
    const pointsValue = MISSION_POINTS[missionId] || 0;
    if (pointsValue === 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message:
            "Invalid mission ID or no points associated with this mission",
        },
        { status: 400 }
      );
    }

    // Check if the mission is already completed
    const { data: existingMission, error: checkError } = await supabase
      .from("user_completed_missions")
      .select("id, points_awarded")
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking mission completion:", checkError);
      return NextResponse.json(
        { error: "Database Error", message: "Failed to check mission status" },
        { status: 500 }
      );
    }

    // If mission already completed and points awarded
    if (existingMission?.points_awarded) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Points already awarded for this mission",
        },
        { status: 400 }
      );
    }

    // Record mission completion
    const { error: missionError } = await supabase
      .from("user_completed_missions")
      .upsert({
        user_id: userId,
        mission_id: missionId,
        points_awarded: true,
        completed_at: new Date().toISOString(),
      });

    if (missionError) {
      console.error("Error recording mission completion:", missionError);
      return NextResponse.json(
        {
          error: "Database Error",
          message: "Failed to record mission completion",
        },
        { status: 500 }
      );
    }

    // Award points using our new points service
    const pointsResult = await awardPoints({
      userId,
      type: PointType.ONBOARDING, // Using onboarding points for missions
      amount: pointsValue,
      description: `Completed mission: ${missionId}`,
      metadata: {
        missionId,
        completedAt: new Date().toISOString(),
      },
      supabase,
    });

    if (!pointsResult.success) {
      console.error("Error awarding points:", pointsResult.error);
      return NextResponse.json(
        { error: "Database Error", message: "Failed to award points" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully awarded ${pointsValue} points for completing mission: ${missionId}`,
      points: pointsValue,
    });
  } catch (error) {
    console.error("Error in award-mission API:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
