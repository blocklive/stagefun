import { NextRequest, NextResponse } from "next/server";
import { withAuth, getSupabaseAdmin } from "@/lib/auth/server";
import { AuthContext } from "@/lib/auth/types";

/**
 * PUT handler - update a test entry
 */
export const PUT = withAuth(
  async (
    request: NextRequest,
    auth: AuthContext,
    { params }: { params: { id: string } }
  ) => {
    // Get the test entry ID
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Test entry ID is required" },
        { status: 400 }
      );
    }

    console.log("Update - Authenticated user ID:", auth.userId);

    try {
      // Parse request body
      const body = await request.json();
      const { size } = body;

      if (!size) {
        return NextResponse.json(
          { error: "Size is required" },
          { status: 400 }
        );
      }

      // Get supabase admin client
      const supabaseAdmin = getSupabaseAdmin();

      // Check if the entry exists and belongs to the user
      const { data: testEntry, error: fetchError } = await supabaseAdmin
        .from("test")
        .select("*")
        .eq("id", id)
        .eq("user_id", auth.userId)
        .single();

      if (fetchError || !testEntry) {
        return NextResponse.json(
          { error: "Test entry not found or access denied" },
          { status: 404 }
        );
      }

      // Update the entry
      const { data, error } = await supabaseAdmin
        .from("test")
        .update({ size, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", auth.userId) // Ensure the user can only update their own entries
        .select()
        .single();

      if (error) {
        console.error("Error updating test entry:", error);
        return NextResponse.json(
          { error: "Failed to update test entry" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    } catch (error) {
      console.error("Error processing request:", error);
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  }
);

/**
 * DELETE handler - delete a test entry
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    auth: AuthContext,
    { params }: { params: { id: string } }
  ) => {
    // Get the test entry ID
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Test entry ID is required" },
        { status: 400 }
      );
    }

    console.log("Delete - Authenticated user ID:", auth.userId);

    // Get supabase admin client
    const supabaseAdmin = getSupabaseAdmin();

    // Check if the entry exists and belongs to the user
    const { data: testEntry, error: fetchError } = await supabaseAdmin
      .from("test")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (fetchError || !testEntry) {
      return NextResponse.json(
        { error: "Test entry not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the entry
    const { error } = await supabaseAdmin
      .from("test")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId); // Ensure the user can only delete their own entries

    if (error) {
      console.error("Error deleting test entry:", error);
      return NextResponse.json(
        { error: "Failed to delete test entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }
);
