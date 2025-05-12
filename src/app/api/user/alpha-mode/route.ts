import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

/**
 * POST handler - Toggle the alpha mode setting for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    console.log("Alpha mode toggle request received");

    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;

    // Parse request body to get the enabled flag
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'enabled' parameter" },
        { status: 400 }
      );
    }

    // Get admin Supabase client for secure operations
    const supabaseAdmin = getSupabaseAdmin();

    // Update the user's alpha_mode flag
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ alpha_mode: enabled })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating alpha mode:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update alpha mode" },
        { status: 500 }
      );
    }

    // Return success with the updated user data
    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error("Error in alpha mode toggle endpoint:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
