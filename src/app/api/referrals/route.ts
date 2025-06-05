import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { withAuth } from "@/lib/auth/server";
import { AuthContext } from "@/lib/auth/types";
import { authenticateRequest } from "@/lib/auth/server";

export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch user's referral codes with usage information
    const { data: codes, error } = await supabase
      .from("access_codes")
      .select(
        `
        id,
        code,
        created_at,
        used_at,
        used_by_user_id,
        is_active,
        used_by_user:users!used_by_user_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq("created_by_user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching referral codes:", error);
      return NextResponse.json(
        { error: "Failed to fetch referral codes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ codes: codes || [] });
  } catch (error) {
    console.error("Error in referrals API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

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
    const body = await request.json();
    const { referrerTwitterUsername, poolId } = body;

    console.log("Referral request:", {
      userId,
      referrerTwitterUsername,
      poolId,
    });

    if (!referrerTwitterUsername || !poolId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Create an admin client with service role permissions
    const adminClient = getSupabaseAdmin();

    // Validate referrer exists and get their user ID
    const { data: referrerUser, error: referrerError } = await adminClient
      .from("users")
      .select("id")
      .ilike("twitter_username", referrerTwitterUsername)
      .maybeSingle();

    if (referrerError) {
      console.error("Error finding referrer:", referrerError);
      return NextResponse.json(
        { error: "Failed to validate referrer" },
        { status: 500 }
      );
    }

    if (!referrerUser) {
      return NextResponse.json(
        { error: "Referrer not found" },
        { status: 404 }
      );
    }

    // Prevent self-referrals
    if (referrerUser.id === userId) {
      return NextResponse.json(
        { error: "Cannot refer yourself" },
        { status: 400 }
      );
    }

    // Validate pool exists - first try by slug, then by ID
    let pool;
    let poolError;

    // Try to find pool by slug first (most common case from URL)
    const { data: poolBySlug, error: slugError } = await adminClient
      .from("pools")
      .select("id, slug")
      .eq("slug", poolId)
      .maybeSingle();

    if (slugError) {
      console.error("Error finding pool by slug:", slugError);
      return NextResponse.json(
        { error: "Failed to validate pool" },
        { status: 500 }
      );
    }

    if (poolBySlug) {
      pool = poolBySlug;
      console.log("Found pool by slug:", { slug: poolId, actualId: pool.id });
    } else {
      // Fallback: try to find by ID (in case someone passes actual UUID)
      const { data: poolById, error: idError } = await adminClient
        .from("pools")
        .select("id, slug")
        .eq("id", poolId)
        .maybeSingle();

      if (idError) {
        console.error("Error finding pool by ID:", idError);
        return NextResponse.json(
          { error: "Failed to validate pool" },
          { status: 500 }
        );
      }

      pool = poolById;
    }

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Store referral (expires in 24 hours) - use the actual pool ID
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    console.log("Storing referral:", {
      user_id: userId,
      referrer_twitter_username: referrerTwitterUsername,
      pool_id: pool.id,
      expires_at: expiresAt.toISOString(),
    });

    const { error: insertError } = await adminClient
      .from("user_referrals")
      .upsert(
        {
          user_id: userId,
          referrer_twitter_username: referrerTwitterUsername,
          pool_id: pool.id,
          expires_at: expiresAt.toISOString(),
          used: false,
        },
        {
          onConflict: "user_id,pool_id,referrer_twitter_username",
        }
      );

    if (insertError) {
      console.error("Error storing referral:", insertError);

      // Check if this is a duplicate referral (already exists)
      if (insertError.code === "23505") {
        console.log("Referral already exists, updating expiry time");
        return NextResponse.json({
          success: true,
          message: "Referral link refreshed",
        });
      }

      return NextResponse.json(
        { error: `Failed to store referral: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log("Referral stored successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing referral:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
