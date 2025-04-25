import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// The list of admin addresses that are allowed to access this API
// This should be moved to environment variables in production
const ADMIN_WALLET_ADDRESSES: string[] = [
  // Add your admin wallet addresses here
  "0x123...",
];

// Create a service-role Supabase client
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials in environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client with service role to bypass RLS
    const supabase = createServiceClient();

    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "list";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (action === "stats") {
      // Get the overall stats
      const { data: runCounts, error: countError } = await supabase
        .from("blockchain_pool_sync_runs")
        .select("status", { count: "exact" })
        .order("status");

      if (countError) {
        console.error("Error fetching run counts:", countError);
        return NextResponse.json(
          { error: "Failed to fetch run counts" },
          { status: 500 }
        );
      }

      // Get the stats for the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: last24HoursData, error: last24HoursError } = await supabase
        .from("blockchain_pool_sync_runs")
        .select("events_found, events_processed, events_skipped, duration_ms")
        .gte("start_time", oneDayAgo.toISOString())
        .eq("status", "completed");

      if (last24HoursError) {
        console.error("Error fetching 24h stats:", last24HoursError);
        return NextResponse.json(
          { error: "Failed to fetch 24h stats" },
          { status: 500 }
        );
      }

      // Calculate status counts - ensure we have type declarations
      const statusCounts = (runCounts || []).reduce(
        (acc: Record<string, number>, row: any) => {
          acc[row.status] = parseInt(row.count as any, 10);
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate 24h stats
      const last24Hours = {
        totalEventsFound: (last24HoursData || []).reduce(
          (sum: number, run: any) => sum + (run.events_found || 0),
          0
        ),
        totalEventsProcessed: (last24HoursData || []).reduce(
          (sum: number, run: any) => sum + (run.events_processed || 0),
          0
        ),
        totalEventsSkipped: (last24HoursData || []).reduce(
          (sum: number, run: any) => sum + (run.events_skipped || 0),
          0
        ),
        avgDurationMs:
          last24HoursData && last24HoursData.length > 0
            ? last24HoursData.reduce(
                (sum: number, run: any) => sum + (run.duration_ms || 0),
                0
              ) / last24HoursData.length
            : 0,
        runCount: last24HoursData ? last24HoursData.length : 0,
      };

      // Get the total count
      const { count } = await supabase
        .from("blockchain_pool_sync_runs")
        .select("*", { count: "exact", head: true });

      return NextResponse.json({
        stats: {
          totalRuns: count,
          statusCounts,
          last24Hours,
        },
      });
    } else if (action === "list") {
      // Get the recent runs
      const { data: runs, error: runsError } = await supabase
        .from("blockchain_pool_sync_runs")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(limit);

      if (runsError) {
        console.error("Error fetching runs:", runsError);
        return NextResponse.json(
          { error: "Failed to fetch runs" },
          { status: 500 }
        );
      }

      return NextResponse.json({ runs });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in blockchain-syncs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
