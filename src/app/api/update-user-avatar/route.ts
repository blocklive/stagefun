import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    console.log("API route called: update-user-avatar");

    // Parse the request body
    const body = await request.json();
    const { userId, avatarUrl } = body;

    console.log("Request body:", { userId, avatarUrl });

    // Validate the input
    if (!userId || !avatarUrl) {
      console.error("Missing required fields:", { userId, avatarUrl });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("Initializing Supabase client with service role key");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the user's avatar_url
    console.log("Updating user avatar in database");
    const { data, error } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user avatar:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("User updated successfully:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
