import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

// GET: Fetch updates for a pool
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const poolId = searchParams.get("poolId");

  if (!poolId) {
    return NextResponse.json({ error: "Pool ID is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get pool updates with creator data
    const { data: updates, error } = await supabase
      .from("pool_updates")
      .select(
        `
        id, 
        title, 
        content, 
        created_at, 
        updated_at, 
        like_count,
        creator_id,
        users:creator_id (id, name, username, avatar_url)
      `
      )
      .eq("pool_id", poolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Error fetching pool updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch pool updates" },
      { status: 500 }
    );
  }
}

// POST: Create a new update (protected, only pool creator can do this)
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const { poolId, title, content } = await request.json();

    if (!poolId || !title || !content) {
      return NextResponse.json(
        { error: "Pool ID, title, and content are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify that the user is the pool creator
    const { data: pool, error: poolError } = await supabase
      .from("pools")
      .select("creator_id")
      .eq("id", poolId)
      .single();

    if (poolError) throw poolError;

    if (!pool || pool.creator_id !== userId) {
      return NextResponse.json(
        { error: "Only the pool creator can post updates" },
        { status: 403 }
      );
    }

    // Create the update
    const { data: update, error } = await supabase
      .from("pool_updates")
      .insert({
        pool_id: poolId,
        creator_id: userId,
        title,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ update });
  } catch (error) {
    console.error("Error creating pool update:", error);
    return NextResponse.json(
      { error: "Failed to create pool update" },
      { status: 500 }
    );
  }
}
