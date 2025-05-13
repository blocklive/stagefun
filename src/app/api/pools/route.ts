import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Query only the fields we need for token lookup
    const { data: pools, error } = await supabase
      .from("pools")
      .select("lp_token_address, token_symbol")
      .not("lp_token_address", "is", null) // Only get pools with token addresses
      .not("token_symbol", "is", null); // Only get pools with token symbols

    if (error) {
      console.error("Error fetching pools data:", error);
      return NextResponse.json(
        { error: "Failed to fetch pools data" },
        { status: 500 }
      );
    }

    console.log(`Successfully retrieved ${pools.length} pool token mappings`);

    return NextResponse.json({
      pools,
      count: pools.length,
    });
  } catch (error) {
    console.error("Unexpected error fetching pools:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
