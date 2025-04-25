import { createSupabaseClient } from "./events.service";

/**
 * Creates a new blockchain pool sync run entry
 */
export async function startBlockchainSyncRun({
  jobName,
  source,
  startBlock,
  endBlock,
  metadata = {},
}: {
  jobName: string;
  source?: string;
  startBlock?: number;
  endBlock?: number;
  metadata?: Record<string, any>;
}) {
  const supabase = createSupabaseClient();
  const startTime = new Date();

  try {
    const { data, error } = await supabase
      .from("blockchain_pool_sync_runs")
      .insert({
        job_name: jobName,
        start_time: startTime.toISOString(),
        status: "running",
        source: source || "api",
        start_block: startBlock,
        end_block: endBlock,
        metadata,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating blockchain sync run:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Failed to create sync run record:", error);
    return null;
  }
}

/**
 * Updates a blockchain pool sync run with results
 */
export async function completeBlockchainSyncRun({
  runId,
  status = "completed",
  eventsFound = 0,
  eventsProcessed = 0,
  eventsSkipped = 0,
  eventsFailed = 0,
  blocksProcessed,
  errorMessage,
  metadata = {},
}: {
  runId: string;
  status?: "completed" | "failed";
  eventsFound?: number;
  eventsProcessed?: number;
  eventsSkipped?: number;
  eventsFailed?: number;
  blocksProcessed?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = createSupabaseClient();
  const endTime = new Date();

  try {
    // Get the start time to calculate duration
    const { data: runData } = await supabase
      .from("blockchain_pool_sync_runs")
      .select("start_time")
      .eq("id", runId)
      .single();

    if (!runData) {
      console.error(`Run with ID ${runId} not found`);
      return false;
    }

    // Calculate duration in milliseconds
    const startTime = new Date(runData.start_time);
    const durationMs = endTime.getTime() - startTime.getTime();

    const { error } = await supabase
      .from("blockchain_pool_sync_runs")
      .update({
        end_time: endTime.toISOString(),
        status,
        events_found: eventsFound,
        events_processed: eventsProcessed,
        events_skipped: eventsSkipped,
        events_failed: eventsFailed,
        blocks_processed: blocksProcessed,
        duration_ms: durationMs,
        error_message: errorMessage,
        metadata: metadata,
      })
      .eq("id", runId);

    if (error) {
      console.error("Error updating blockchain sync run:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update sync run record:", error);
    return false;
  }
}

/**
 * Gets recent blockchain sync runs
 */
export async function getRecentBlockchainSyncRuns(limit = 20) {
  const supabase = createSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("blockchain_pool_sync_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent sync runs:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch sync runs:", error);
    return [];
  }
}

/**
 * Gets summary statistics of blockchain sync runs
 */
export async function getBlockchainSyncStats() {
  const supabase = createSupabaseClient();

  try {
    // Get total runs
    const { data: totalRuns, error: totalError } = await supabase
      .from("blockchain_pool_sync_runs")
      .select("count", { count: "exact" });

    if (totalError) {
      console.error("Error fetching total run count:", totalError);
      return null;
    }

    // Get distinct statuses
    const { data: statuses, error: statusesError } = await supabase
      .from("blockchain_pool_sync_runs")
      .select("status")
      .order("status");

    if (statusesError) {
      console.error("Error fetching statuses:", statusesError);
      return null;
    }

    // Create status counts map
    const statusCounts: Record<string, number> = {};

    // Fetch count for each status
    for (const statusObj of statuses) {
      const status = statusObj.status;
      const { count, error: countError } = await supabase
        .from("blockchain_pool_sync_runs")
        .select("id", { count: "exact" })
        .eq("status", status);

      if (countError) {
        console.error(`Error counting status ${status}:`, countError);
        statusCounts[status] = 0;
      } else {
        statusCounts[status] = count || 0;
      }
    }

    // Get most recent 24 hours of runs
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentRuns, error: recentError } = await supabase
      .from("blockchain_pool_sync_runs")
      .select("*")
      .gte("start_time", oneDayAgo.toISOString())
      .order("start_time", { ascending: false });

    if (recentError) {
      console.error("Error fetching recent runs:", recentError);
      return null;
    }

    // Calculate event stats from the last 24 hours
    const last24HoursStats = recentRuns.reduce(
      (
        acc: {
          totalEventsFound: number;
          totalEventsProcessed: number;
          totalEventsSkipped: number;
          avgDurationMs: number;
          runCount: number;
        },
        run: {
          events_found?: number;
          events_processed?: number;
          events_skipped?: number;
          duration_ms?: number;
        }
      ) => {
        acc.totalEventsFound += run.events_found || 0;
        acc.totalEventsProcessed += run.events_processed || 0;
        acc.totalEventsSkipped += run.events_skipped || 0;
        acc.avgDurationMs += run.duration_ms || 0;
        acc.runCount += 1;
        return acc;
      },
      {
        totalEventsFound: 0,
        totalEventsProcessed: 0,
        totalEventsSkipped: 0,
        avgDurationMs: 0,
        runCount: 0,
      }
    );

    if (last24HoursStats.runCount > 0) {
      last24HoursStats.avgDurationMs = Math.round(
        last24HoursStats.avgDurationMs / last24HoursStats.runCount
      );
    }

    return {
      totalRuns: totalRuns[0]?.count || 0,
      statusCounts,
      last24Hours: last24HoursStats,
    };
  } catch (error) {
    console.error("Failed to fetch sync stats:", error);
    return null;
  }
}
