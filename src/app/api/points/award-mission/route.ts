import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth/server";

// Map of mission IDs to point values
const MISSION_POINTS: Record<string, number> = {
  link_x: 10000,
  follow_x: 10000,
  create_pool: 50000,
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

    const { userId } = authResult;
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

    // Begin transaction with manual steps

    // 1. Record mission completion
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

    // 2. Award points to user
    const { error: pointsError } = await supabase.from("user_points").upsert(
      {
        user_id: userId,
        total_points: pointsValue,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      }
    );

    if (pointsError) {
      // Try an update if the insert with upsert failed
      const { data: currentPoints, error: getPointsError } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", userId)
        .single();

      if (getPointsError) {
        console.error("Error getting current points:", getPointsError);
        return NextResponse.json(
          { error: "Database Error", message: "Failed to award points" },
          { status: 500 }
        );
      }

      // Update with the new total
      const { error: updateError } = await supabase
        .from("user_points")
        .update({
          total_points: (currentPoints?.total_points || 0) + pointsValue,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating points:", updateError);
        return NextResponse.json(
          { error: "Database Error", message: "Failed to award points" },
          { status: 500 }
        );
      }
    }

    // 3. Log the transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: userId,
        points_amount: pointsValue,
        transaction_type: "MISSION_COMPLETE",
        description: `Completed mission: ${missionId}`,
      });

    if (transactionError) {
      console.error("Error logging points transaction:", transactionError);
      // We'll still consider this a success even if the transaction log fails
      console.warn(
        "Couldn't log the points transaction, but points were awarded"
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
