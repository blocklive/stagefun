import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Access code is required" },
        { status: 400 }
      );
    }

    // Check if the code exists in the database
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .ilike("code", code)
      .eq("is_active", true)
      .single();

    if (codeError || !codeData) {
      console.error("Error retrieving access code:", codeError);
      return NextResponse.json(
        { success: false, error: "Invalid access code" },
        { status: 400 }
      );
    }

    // Check if the code has reached its maximum usage
    if (codeData.usage_count >= codeData.max_uses) {
      return NextResponse.json(
        { success: false, error: "Access code has reached maximum usage" },
        { status: 400 }
      );
    }

    // Increment the usage count (but don't mark it as used by a specific user yet)
    const { error: updateError } = await supabaseAdmin
      .from("access_codes")
      .update({
        usage_count: codeData.usage_count + 1,
        // If we've reached max uses after this increment, deactivate the code
        is_active: codeData.usage_count + 1 < codeData.max_uses,
      })
      .eq("id", codeData.id);

    if (updateError) {
      console.error("Error updating access code usage:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to process access code" },
        { status: 500 }
      );
    }

    // Store the code in the session cookie
    const response = NextResponse.json({ success: true });

    // Set a cookie to track that the user has entered a valid code
    response.cookies.set("access_code", code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Also set the accessCodeVerified cookie that middleware checks
    response.cookies.set("accessCodeVerified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error validating access code:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while validating the code" },
      { status: 500 }
    );
  }
}
