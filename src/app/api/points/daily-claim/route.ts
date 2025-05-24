import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../lib/auth/server";
import { createClient } from "@supabase/supabase-js";
import {
  DAILY_CHECKIN_POINTS,
  DAILY_CHECKIN_ACTION,
  MIN_CHECKIN_INTERVAL_HOURS,
  awardPointsForDailyCheckin,
  formatTimeRemaining,
  PointType,
} from "../../../../lib/services/points.service";

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

    const userId = authResult.userId as string;

    // Ensure userId is defined
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in authentication" },
        { status: 400 }
      );
    }

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

        return NextResponse.json(
          {
            success: false,
            nextAvailableAt: checkinData.next_available_at,
            message: `You can claim again in ${formatTimeRemaining(
              timeRemaining
            )}`,
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

      // Update the daily check-in record
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

      // Use the new points service function to award daily check-in points
      const pointsResult = await awardPointsForDailyCheckin({
        userId: userId as string,
        timestamp: currentTime,
        streakCount: newStreakCount,
        supabase: supabaseAdmin,
      });

      if (!pointsResult.success) {
        console.error("Error awarding check-in points:", pointsResult.error);
        return NextResponse.json(
          { error: "Failed to award points" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        points: pointsResult.pointsAwarded || DAILY_CHECKIN_POINTS,
        basePoints: DAILY_CHECKIN_POINTS,
        multiplier: pointsResult.multiplierInfo?.multiplier || 1.0,
        streakTier: pointsResult.multiplierInfo?.tier || "Starter",
        newStreak: newStreakCount,
        nextAvailableAt: nextAvailableDate.toISOString(),
        nextTierAt: pointsResult.multiplierInfo?.nextTierAt,
        nextTierMultiplier: pointsResult.multiplierInfo?.nextTierMultiplier,
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

      // Use the new points service function to award daily check-in points
      const pointsResult = await awardPointsForDailyCheckin({
        userId: userId as string,
        timestamp: currentTime,
        streakCount: 1,
        supabase: supabaseAdmin,
      });

      if (!pointsResult.success) {
        console.error("Error awarding check-in points:", pointsResult.error);
        return NextResponse.json(
          { error: "Failed to award points" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        points: pointsResult.pointsAwarded || DAILY_CHECKIN_POINTS,
        basePoints: DAILY_CHECKIN_POINTS,
        multiplier: pointsResult.multiplierInfo?.multiplier || 1.0,
        streakTier: pointsResult.multiplierInfo?.tier || "Starter",
        newStreak: 1,
        nextAvailableAt: nextAvailableDate.toISOString(),
        nextTierAt: pointsResult.multiplierInfo?.nextTierAt,
        nextTierMultiplier: pointsResult.multiplierInfo?.nextTierMultiplier,
      });
    }
  } catch (error) {
    console.error("Error processing daily check-in:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
