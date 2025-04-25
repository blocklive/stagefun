import { NextResponse } from "next/server";
import {
  EVENT_TOPICS,
  processWebhookEvents,
  createSupabaseClient,
} from "@/lib/services/blockchain/events.service";
import {
  EventFilter,
  BLOCKS_PER_HOUR,
  getBlockNumberHoursAgo,
  fetchBlockchainEvents,
  filterNewEvents,
  getEthersProvider,
} from "@/lib/services/blockchain/queries.service";

// RPC URL from environment variable
const MONAD_RPC_URL = process.env.MONAD_TESTNET_RPC_URL;

// Cron verification token to ensure only Vercel cron can trigger this
const CRON_SECRET = process.env.CRON_SECRET;

// Database event interface
interface BlockchainEvent {
  id: string;
  blockchain_network: string;
  transaction_hash: string;
  log_index: number;
  block_number: number;
  raw_event: any;
}

/**
 * Process any pending events from the blockchain_events table
 */
async function processPendingEvents(supabase: any) {
  // Get pending events
  const { data: pendingEvents, error } = await supabase
    .from("blockchain_events")
    .select("*")
    .eq("status", "pending")
    .limit(50) // Process in batches
    .order("block_number", { ascending: true });

  if (error) {
    console.error("Error fetching pending events:", error);
    throw error;
  }

  if (!pendingEvents || pendingEvents.length === 0) {
    return { processed: 0 };
  }

  console.log(`Processing ${pendingEvents.length} pending events`);

  // Extract raw events for processing
  const rawEvents = pendingEvents.map(
    (event: BlockchainEvent) => event.raw_event
  );

  // Process events with the central processing function
  // Skip event storage since these events are already in the blockchain_events table
  const result = await processWebhookEvents(rawEvents, {
    skipEventStorage: true,
    source: "backfill-reprocess",
  });

  // Update events status manually since we skipped automatic status updates
  try {
    await supabase
      .from("blockchain_events")
      .update({
        status: "processed",
        processed_at: new Date(),
        updated_at: new Date(),
      })
      .in(
        "id",
        pendingEvents.map((e: BlockchainEvent) => e.id)
      );

    console.log(
      `Updated status for ${pendingEvents.length} reprocessed events`
    );
  } catch (updateError) {
    console.error("Error updating blockchain_events status:", updateError);
  }

  return { processed: pendingEvents.length, result };
}

/**
 * GET handler for the hourly cron job
 */
export async function GET(req: Request) {
  // Verify this is a legitimate cron job request from Vercel
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!MONAD_RPC_URL) {
    return NextResponse.json(
      { error: "MONAD_RPC_URL environment variable not configured" },
      { status: 500 }
    );
  }

  try {
    // Initialize provider and Supabase
    const provider = getEthersProvider(MONAD_RPC_URL);
    const supabase = createSupabaseClient();

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();

    // Calculate start block (approximately 1 hour ago)
    // Default to 1 hour lookback, but can be configured via query param
    const hoursAgo = parseInt(searchParams.get("hoursAgo") || "1");
    const startBlock = getBlockNumberHoursAgo(latestBlock, hoursAgo);

    // Create filter for all relevant event topics
    const eventFilter: EventFilter = {
      topics: [
        [
          EVENT_TOPICS.POOL_CREATED,
          EVENT_TOPICS.TIER_COMMITTED,
          EVENT_TOPICS.POOL_STATUS_UPDATED,
        ] as any,
      ],
      fromBlock: startBlock,
      toBlock: latestBlock,
    };

    // Phase 1: Fetch events from blockchain with chunking
    const events = await fetchBlockchainEvents(provider, eventFilter, {
      chunkSize: 100,
      delayBetweenChunks: 300,
    });

    // Phase 2: Filter events against database to find new ones
    const newEvents = await filterNewEvents(events, supabase);

    // Phase 3: Process any new events found
    let newEventsResult = null;
    if (newEvents.length > 0) {
      // Process the new events using the central event processor
      // and specify 'backfill' as the source
      newEventsResult = await processWebhookEvents(newEvents, {
        source: "cron",
      });
    }

    // Phase 4: Process any pending events that might have failed in previous runs
    const processResult = await processPendingEvents(supabase);

    return NextResponse.json({
      success: true,
      summary: {
        blockRange: {
          fromBlock: startBlock,
          toBlock: latestBlock,
          hoursAgo,
        },
        eventsFound: events.length,
        newEventsFound: newEvents.length,
        newEventsProcessed: newEventsResult?.processed || 0,
        pendingEventsProcessed: processResult.processed,
      },
    });
  } catch (error: any) {
    console.error("Error in events check cron job:", error);
    return NextResponse.json(
      {
        error: "Failed to process events check",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Optional: Add a POST handler for manual triggering (with auth)
export async function POST(req: Request) {
  // Similar to GET but can accept custom parameters
  // Add authentication here
  return NextResponse.json({ message: "Manual trigger not implemented yet" });
}
