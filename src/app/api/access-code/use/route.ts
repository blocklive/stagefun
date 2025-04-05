import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest } from "../../../../lib/auth/server";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { userId } = authResult;

    // Get access code from cookie
    const accessCode = request.cookies.get("access_code")?.value;

    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: "No access code found" },
        { status: 400 }
      );
    }

    // Get the access code record
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", accessCode)
      .eq("is_active", true)
      .single();

    if (codeError) {
      console.error("Error retrieving access code:", codeError);
      return NextResponse.json(
        { success: false, error: "Invalid access code" },
        { status: 400 }
      );
    }

    // Update the access code to mark it as used
    const { error: updateError } = await supabaseAdmin
      .from("access_codes")
      .update({
        usage_count: codeData.usage_count + 1,
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
        // If we've reached max uses, deactivate the code
        is_active: codeData.usage_count + 1 < codeData.max_uses,
      })
      .eq("id", codeData.id);

    if (updateError) {
      console.error("Error updating access code usage:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to record access code usage" },
        { status: 500 }
      );
    }

    // Clear the access code cookie as it's been used
    const response = NextResponse.json({ success: true });
    response.cookies.delete("access_code");

    return response;
  } catch (error) {
    console.error("Error using access code:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while using the access code",
      },
      { status: 500 }
    );
  }
}
