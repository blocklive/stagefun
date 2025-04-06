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

    // Ensure code is in SF-XXXXXX format
    let formattedCode = code.trim().toUpperCase();
    if (!formattedCode.startsWith("SF-")) {
      formattedCode = `SF-${formattedCode}`;
    }

    // Check if the code has the correct format
    if (!formattedCode.match(/^SF-[A-Z0-9]{6}$/)) {
      return NextResponse.json(
        { success: false, error: "Invalid access code format" },
        { status: 400 }
      );
    }

    // Check if the code exists in the database
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .ilike("code", formattedCode)
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

    // Check if the code is already fully utilized by a user
    if (codeData.fully_utilized) {
      return NextResponse.json(
        { success: false, error: "Access code has already been used" },
        { status: 400 }
      );
    }

    // Don't update usage_count or is_active here at all
    // Just set the cookies and let complete-login handle all updates

    // Store the code in the session cookie
    const response = NextResponse.json({ success: true });

    // Set a cookie to track that the user has entered a valid code
    response.cookies.set("access_code", formattedCode, {
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
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while validating the code";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
