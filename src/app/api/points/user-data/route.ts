import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  extractBearerToken,
  getSupabaseAdmin,
} from "../../../../lib/auth/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Authenticate the request using Privy JWT
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      console.log("Authentication failed:", authResult.error);
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { userId } = authResult;

    // Get Supabase admin client from helper to reuse the client
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch user points data and check-in data in parallel
    const dbStartTime = Date.now();
    const [pointsResult, checkinResult] = await Promise.all([
      supabaseAdmin
        .from("user_points")
        .select("*")
        .eq("user_id", userId as string)
        .single(),
      supabaseAdmin
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId as string)
        .single(),
    ]);

    // Extract data and handle errors
    const { data: userPoints, error: pointsError } = pointsResult;
    const { data: checkinData, error: checkinError } = checkinResult;

    if (pointsError && pointsError.code !== "PGRST116") {
      console.error("Error fetching user points:", pointsError);
      return NextResponse.json(
        { error: "Failed to fetch user points" },
        { status: 500 }
      );
    }

    if (checkinError && checkinError.code !== "PGRST116") {
      console.error("Error fetching daily check-in:", checkinError);
      return NextResponse.json(
        { error: "Failed to fetch check-in data" },
        { status: 500 }
      );
    }

    // Return both datasets
    const response = {
      points: userPoints || {
        user_id: userId,
        total_points: 0,
        funded_points: 0,
        raised_points: 0,
        onboarding_points: 0,
        checkin_points: 0,
      },
      checkin: checkinData || null,
      pointsBreakdown: userPoints
        ? {
            funded: userPoints.funded_points || 0,
            raised: userPoints.raised_points || 0,
            onboarding: userPoints.onboarding_points || 0,
            checkin: userPoints.checkin_points || 0,
            total:
              Number(userPoints.funded_points || 0) +
              Number(userPoints.raised_points || 0) +
              Number(userPoints.onboarding_points || 0) +
              Number(userPoints.checkin_points || 0),
          }
        : {
            funded: 0,
            raised: 0,
            onboarding: 0,
            checkin: 0,
            total: 0,
          },
    };

    console.log(`Total API request took ${Date.now() - startTime}ms`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in user-data API:", error);
    console.log(`Failed API request took ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
