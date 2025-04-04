import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

// Define expected request body structure
interface UpdatePoolRequestBody {
  poolId: string;
  updates: {
    name?: string;
    description?: string;
    min_commitment?: number;
    location?: string;
    social_links?: any;
    image_url?: string | null;
    // Add other fields that can be updated here
  };
}

/**
 * API route to update a pool's details
 * This uses the Supabase admin client to bypass RLS policies
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }
    const userId = authResult.userId;
    console.log(`Authenticated user ${userId} for pool update.`);

    // 2. Parse request body
    const { poolId, updates }: UpdatePoolRequestBody = await request.json();
    console.log("Received pool update request:", {
      poolId,
      updateFields: Object.keys(updates),
    });

    if (!poolId || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    // Get admin client for database operations
    const adminClient = getSupabaseAdmin();

    // 3. Verify the user is authorized to update this pool
    const { data: pool, error: verifyError } = await adminClient
      .from("pools")
      .select("id, creator_id")
      .eq("id", poolId)
      .single();

    if (verifyError || !pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    if (pool.creator_id !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to update this pool" },
        { status: 403 }
      );
    }

    // 4. Apply the updates
    const { data: updatedPool, error: updateError } = await adminClient
      .from("pools")
      .update(updates)
      .eq("id", poolId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating pool:", updateError);
      return NextResponse.json(
        { error: `Database error updating pool: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 5. Return success response with updated pool data
    return NextResponse.json({
      success: true,
      data: updatedPool,
      message: "Pool updated successfully",
    });
  } catch (error: any) {
    console.error("Error in pool update API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
