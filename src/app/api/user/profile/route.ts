import { NextRequest, NextResponse } from "next/server";
import {
  verifyPrivyToken,
  extractBearerToken,
  getSupabaseAdmin,
} from "@/lib/auth/server";

/**
 * GET handler - Retrieve the authenticated user's profile data
 */
export async function GET(request: NextRequest) {
  try {
    console.log("User profile request received");

    // Extract and verify Privy token
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No Authorization header or invalid format" },
        { status: 401 }
      );
    }

    const tokenPayload = await verifyPrivyToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get admin Supabase client for secure operations
    const supabaseAdmin = getSupabaseAdmin();

    // Extract wallet address from token
    const privyDid = tokenPayload.sub;

    // Get user by privy_did
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("privy_did", privyDid)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to get user data" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in user profile endpoint:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
