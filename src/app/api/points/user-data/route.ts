import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../lib/auth/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: NextRequest) {
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

    // Fetch user points data
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

    // Fetch daily check-in data
    const { data: checkinData, error: checkinError } = await supabaseAdmin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (checkinError && checkinError.code !== "PGRST116") {
      console.error("Error fetching daily check-in:", checkinError);
      return NextResponse.json(
        { error: "Failed to fetch check-in data" },
        { status: 500 }
      );
    }

    // Return both datasets
    return NextResponse.json({
      points: userPoints || null,
      checkin: checkinData || null,
    });
  } catch (error) {
    console.error("Error in user-data API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
