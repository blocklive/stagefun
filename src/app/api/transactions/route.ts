import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = page * limit;

    const supabase = getSupabaseAdmin();

    // Fetch transactions for the authenticated user
    const { data: transactions, error } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Check if there are more transactions
    const { count } = await supabase
      .from("point_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authResult.userId);

    const hasMore = offset + limit < (count || 0);

    return NextResponse.json({
      transactions: transactions || [],
      hasMore,
      total: count || 0,
    });
  } catch (error) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
