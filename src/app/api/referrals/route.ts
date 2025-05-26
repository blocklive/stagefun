import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { withAuth } from "@/lib/auth/server";
import { AuthContext } from "@/lib/auth/types";

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
