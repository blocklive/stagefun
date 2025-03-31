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
        alreadyCompleted: true,
        message: "You've already completed this mission!",
      });
    }

    // Check if user has a Twitter username
    const { data: user, error: userError } = await adminClient
      .from("users")
      .select("twitter_username")
      .eq("id", userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "Failed to check user status" },
        { status: 500 }
      );
    }

    if (!user?.twitter_username) {
      return NextResponse.json({
        error: "Twitter account not linked",
        message: "Please link your Twitter account first.",
      });
    }

    // Insert the completed mission
    const { error: insertError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: "link_x",
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
          mission_id: "link_x",
          reason: "Linked Twitter account",
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
      alreadyCompleted: false,
      message: "Mission completed! You've earned 100 points.",
    });
  } catch (error) {
    console.error("Error verifying Twitter mission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
