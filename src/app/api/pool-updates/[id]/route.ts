import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

// PUT: Update an existing pool update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updateId = params.id;

    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const { title, content } = await request.json();

    if (!title && !content) {
      return NextResponse.json(
        { error: "Title or content is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the update and check if user is the creator
    const { data: existingUpdate, error: fetchError } = await supabase
      .from("pool_updates")
      .select("creator_id, pool_id")
      .eq("id", updateId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (existingUpdate.creator_id !== userId) {
      return NextResponse.json(
        { error: "Only the update creator can edit this update" },
        { status: 403 }
      );
    }

    // Update the pool update
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;

    const { data: update, error } = await supabase
      .from("pool_updates")
      .update(updateData)
      .eq("id", updateId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ update });
  } catch (error) {
    console.error("Error updating pool update:", error);
    return NextResponse.json(
      { error: "Failed to update pool update" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a pool update
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updateId = params.id;

    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const supabase = getSupabaseAdmin();

    // Get the update and check if user is the creator
    const { data: existingUpdate, error: fetchError } = await supabase
      .from("pool_updates")
      .select("creator_id, pool_id")
      .eq("id", updateId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (existingUpdate.creator_id !== userId) {
      return NextResponse.json(
        { error: "Only the update creator can delete this update" },
        { status: 403 }
      );
    }

    // Delete the update
    const { error } = await supabase
      .from("pool_updates")
      .delete()
      .eq("id", updateId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pool update:", error);
    return NextResponse.json(
      { error: "Failed to delete pool update" },
      { status: 500 }
    );
  }
}
