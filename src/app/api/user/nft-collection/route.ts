import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

/**
 * POST handler - Update the selected NFT collection for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    console.log("NFT collection update request received");

    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;

    // Parse request body to get the collection ID
    const body = await request.json();
    const { collectionId } = body;

    if (typeof collectionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'collectionId' parameter",
        },
        { status: 400 }
      );
    }

    // Get admin Supabase client for secure operations
    const supabaseAdmin = getSupabaseAdmin();

    // Update the user's selected_nft_collection
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ selected_nft_collection: collectionId })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating NFT collection:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update NFT collection" },
        { status: 500 }
      );
    }

    // Return success with the updated user data
    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error("Error in NFT collection update endpoint:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
