import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../lib/auth/server";
import { createClient } from "@supabase/supabase-js";
import {
  DAILY_CHECKIN_POINTS,
  DAILY_CHECKIN_ACTION,
  MIN_CHECKIN_INTERVAL_HOURS,
} from "../../../../lib/services/points-service";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
    const currentTime = new Date();

    // Check if user has already claimed points today
    const { data: checkinData, error: checkinError } = await supabaseAdmin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (checkinError && checkinError.code !== "PGRST116") {
      console.error("Error fetching daily check-in status:", checkinError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // If user has a check-in record, verify if they can claim again
    if (checkinData) {
      const nextAvailableTime = new Date(checkinData.next_available_at);

      if (currentTime < nextAvailableTime) {
        const timeRemaining = Math.max(
          0,
          nextAvailableTime.getTime() - currentTime.getTime()
        );
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );

        return NextResponse.json(
          {
            success: false,
            nextAvailableAt: checkinData.next_available_at,
            message: `You can claim again in ${hours}h ${minutes}m`,
          },
          { status: 429 }
        );
      }

      // Calculate streak count
      const lastCheckin = new Date(checkinData.last_checkin_at);
      const hoursSinceLastCheckin =
        (currentTime.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60);

      // If they checked in within 48 hours, increment streak
      // Otherwise reset to 1
      let newStreakCount = 1;
      if (hoursSinceLastCheckin <= 48) {
        newStreakCount = checkinData.streak_count + 1;
      }

      // Calculate next available claim time
      const nextAvailableDate = new Date(currentTime);
      nextAvailableDate.setHours(
        nextAvailableDate.getHours() + MIN_CHECKIN_INTERVAL_HOURS
      );

      // Start transaction directly in the API
      // 1. Update the daily check-in record
      const { error: updateCheckinError } = await supabaseAdmin
        .from("daily_checkins")
        .update({
          streak_count: newStreakCount,
          last_checkin_at: currentTime.toISOString(),
          next_available_at: nextAvailableDate.toISOString(),
        })
        .eq("user_id", userId);

      if (updateCheckinError) {
        console.error("Error updating daily check-in:", updateCheckinError);
        return NextResponse.json(
          { error: "Failed to update daily check-in" },
          { status: 500 }
        );
      }

      // 2. Get user's current points or create a record if it doesn't exist
      const { data: userPoints, error: pointsError } = await supabaseAdmin
        .from("user_points")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (pointsError && pointsError.code !== "PGRST116") {
        console.error("Error fetching user points:", pointsError);
        return NextResponse.json(
          { error: "Failed to fetch user points" },
          { status: 500 }
        );
      }

      // 3. Update or create user points record
      if (userPoints) {
        // Update existing points record
        const { error: updatePointsError } = await supabaseAdmin
          .from("user_points")
          .update({
            total_points: userPoints.total_points + DAILY_CHECKIN_POINTS,
            updated_at: currentTime.toISOString(),
          })
          .eq("user_id", userId);

        if (updatePointsError) {
          console.error("Error updating user points:", updatePointsError);
          return NextResponse.json(
            { error: "Failed to update points" },
            { status: 500 }
          );
        }
      } else {
        // Create new points record
        const { error: createPointsError } = await supabaseAdmin
          .from("user_points")
          .insert({
            user_id: userId,
            total_points: DAILY_CHECKIN_POINTS,
            created_at: currentTime.toISOString(),
            updated_at: currentTime.toISOString(),
          });

        if (createPointsError) {
          console.error("Error creating user points:", createPointsError);
          return NextResponse.json(
            { error: "Failed to create points record" },
            { status: 500 }
          );
        }
      }

      // 4. Create transaction record
      const { error: transactionError } = await supabaseAdmin
        .from("point_transactions")
        .insert({
          user_id: userId,
          amount: DAILY_CHECKIN_POINTS,
          action_type: DAILY_CHECKIN_ACTION,
          metadata: {
            streak_count: newStreakCount,
          },
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
        return NextResponse.json(
          { error: "Failed to record transaction" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        points: DAILY_CHECKIN_POINTS,
        newStreak: newStreakCount,
        nextAvailableAt: nextAvailableDate.toISOString(),
      });
    } else {
      // First time check-in - create new records
      // Calculate next available claim time
      const nextAvailableDate = new Date(currentTime);
      nextAvailableDate.setHours(
        nextAvailableDate.getHours() + MIN_CHECKIN_INTERVAL_HOURS
      );

      // 1. Create initial daily check-in record
      const { error: createCheckinError } = await supabaseAdmin
        .from("daily_checkins")
        .insert({
          user_id: userId,
          streak_count: 1,
          last_checkin_at: currentTime.toISOString(),
          next_available_at: nextAvailableDate.toISOString(),
        });

      if (createCheckinError) {
        console.error("Error creating daily check-in:", createCheckinError);
        return NextResponse.json(
          { error: "Failed to create daily check-in record" },
          { status: 500 }
        );
      }

      // 2. Create initial user points record
      const { error: createPointsError } = await supabaseAdmin
        .from("user_points")
        .insert({
          user_id: userId,
          total_points: DAILY_CHECKIN_POINTS,
          created_at: currentTime.toISOString(),
          updated_at: currentTime.toISOString(),
        });

      if (createPointsError) {
        console.error("Error creating user points:", createPointsError);
        return NextResponse.json(
          { error: "Failed to create points record" },
          { status: 500 }
        );
      }

      // 3. Create transaction record
      const { error: transactionError } = await supabaseAdmin
        .from("point_transactions")
        .insert({
          user_id: userId,
          amount: DAILY_CHECKIN_POINTS,
          action_type: DAILY_CHECKIN_ACTION,
          metadata: {
            streak_count: 1,
          },
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
        return NextResponse.json(
          { error: "Failed to record transaction" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        points: DAILY_CHECKIN_POINTS,
        newStreak: 1,
        nextAvailableAt: nextAvailableDate.toISOString(),
      });
    }
  } catch (error) {
    console.error("Error in daily-claim API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
