import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

// GET: Check if a user has liked an update and get total likes
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const updateId = searchParams.get("updateId");
  const userId = searchParams.get("userId");

  if (!updateId) {
    return NextResponse.json(
      { error: "Update ID is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get the total like count
    const { data: update, error: updateError } = await supabase
      .from("pool_updates")
      .select("like_count")
      .eq("id", updateId)
      .single();

    if (updateError) throw updateError;

    // If userId is provided, check if user has liked this update
    let hasLiked = false;
    if (userId) {
      const { data: like, error: likeError } = await supabase
        .from("pool_update_likes")
        .select("id")
        .eq("update_id", updateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!likeError && like) {
        hasLiked = true;
      }
    }

    return NextResponse.json({
      likeCount: update?.like_count || 0,
      hasLiked,
    });
  } catch (error) {
    console.error("Error fetching like status:", error);
    return NextResponse.json(
      { error: "Failed to fetch like status" },
      { status: 500 }
    );
  }
}

// POST: Like or unlike an update
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
    const { updateId, action } = await request.json();

    if (!updateId || !["like", "unlike"].includes(action)) {
      return NextResponse.json(
        { error: "Update ID and valid action (like or unlike) are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if the update exists
    const { data: update, error: updateError } = await supabase
      .from("pool_updates")
      .select("id, like_count")
      .eq("id", updateId)
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    // Ensure we have a number for like_count
    const currentLikeCount =
      typeof update.like_count === "number" ? update.like_count : 0;

    if (action === "like") {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from("pool_update_likes")
        .select("id")
        .eq("update_id", updateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLike) {
        return NextResponse.json({ message: "Already liked" });
      }

      // Create like and increment count
      const { data: like, error: likeError } = await supabase
        .from("pool_update_likes")
        .insert({
          update_id: updateId,
          user_id: userId,
        })
        .select();

      if (likeError) throw likeError;

      // Increment like count
      const { error: updateError } = await supabase
        .from("pool_updates")
        .update({ like_count: currentLikeCount + 1 })
        .eq("id", updateId);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, action: "liked" });
    } else {
      // Unlike: Delete the like record
      const { error: deleteError } = await supabase
        .from("pool_update_likes")
        .delete()
        .eq("update_id", updateId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Decrement like count, ensuring it doesn't go below 0
      const newLikeCount = Math.max(currentLikeCount - 1, 0);
      const { error: updateError } = await supabase
        .from("pool_updates")
        .update({ like_count: newLikeCount })
        .eq("id", updateId);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, action: "unliked" });
    }
  } catch (error) {
    console.error("Error processing like/unlike:", error);
    return NextResponse.json(
      { error: "Failed to process like/unlike" },
      { status: 500 }
    );
  }
}
