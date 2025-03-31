import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  extractBearerToken,
} from "../../../../lib/auth/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Log request headers for debugging
    const authHeader = request.headers.get("Authorization");
    console.log("== USER-DATA API ==");
    console.log("Auth header present:", !!authHeader);
    if (authHeader) {
      console.log(
        "Auth header starts with:",
        authHeader.substring(0, 15) + "..."
      );
    }

    // Extract the token manually for debugging
    const token = extractBearerToken(request);
    console.log(
      "Token extracted:",
      token ? "Yes (length: " + token.length + ")" : "No"
    );

    // Authenticate the request using Privy JWT
    console.log("Calling authenticateRequest...");
    const authResult = await authenticateRequest(request);
    console.log("Auth result:", {
      authenticated: authResult.authenticated,
      userId: authResult.userId,
      error: authResult.error,
    });

    if (!authResult.authenticated) {
      console.log("Authentication failed:", authResult.error);
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
      points: userPoints || { user_id: userId, total_points: 0 },
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
