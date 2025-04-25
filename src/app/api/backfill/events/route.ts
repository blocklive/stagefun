import { NextRequest, NextResponse } from "next/server";
import {
  EVENT_TOPICS,
  processWebhookEvents,
  createSupabaseClient,
} from "@/lib/services/blockchain/events.service";
import {
  EventFilter,
  getEthersProvider,
  fetchBlockchainEvents,
  filterNewEvents,
} from "@/lib/services/blockchain/queries.service";
import {
  startBlockchainSyncRun,
  completeBlockchainSyncRun,
} from "@/lib/services/blockchain/sync-tracking.service";

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Default is to require API key for protection, can be disabled in dev
const BACKFILL_API_KEY = process.env.BACKFILL_API_KEY;

/**
 * Generates unix timestamp for N hours ago
 */
function getTimestampHoursAgo(hours: number): number {
  return Math.floor(Date.now() / 1000) - hours * 60 * 60;
}

/**
 * Converts a unix timestamp to an approximate block number
 * Note: This is an estimate based on average block time
 * For Monad, this might need adjustment based on actual block time
 */
async function getBlockNumberFromTimestamp(
  provider: any,
  timestamp: number
): Promise<number> {
  try {
    // Get the latest block for reference
    const latestBlock = await provider.getBlock("latest");
    if (!latestBlock) {
      throw new Error("Failed to fetch latest block");
    }

    // Average block time in seconds (adjust as needed for Monad)
    const AVG_BLOCK_TIME = 2; // Assuming 2 seconds per block

    // Calculate the approximate number of blocks since the target timestamp
    const secondsElapsed = latestBlock.timestamp - timestamp;
    const blocksSince = Math.floor(secondsElapsed / AVG_BLOCK_TIME);

    // Calculate estimated block number at the timestamp
    const estimatedBlockNumber = Math.max(0, latestBlock.number - blocksSince);

    return estimatedBlockNumber;
  } catch (error) {
    console.error("Error estimating block number from timestamp:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;

  // API key validation (if enabled)
  const apiKey = searchParams.get("apiKey");
  if (apiKey !== BACKFILL_API_KEY) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!ALCHEMY_API_KEY) {
    return NextResponse.json(
      { error: "No Alchemy API key configured" },
      { status: 500 }
    );
  }

  // Variable to store the sync run ID
  let syncRunId: string | null = null;

  try {
    // Initialize provider and Supabase
    const provider = getEthersProvider(
      `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
    const supabase = createSupabaseClient();

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();

    // Determine backfill mode: contract-specific or time-based
    const contractAddress = searchParams.get("contractAddress");
    const mode = contractAddress ? "contract" : "timeRange";

    console.log(
      `Backfill mode: ${mode}${
        contractAddress ? ` for contract ${contractAddress}` : ""
      }`
    );

    // Set up the event filter
    const eventFilter: EventFilter = {
      topics: [
        [
          EVENT_TOPICS.POOL_CREATED,
          EVENT_TOPICS.TIER_COMMITTED,
          EVENT_TOPICS.POOL_STATUS_UPDATED,
        ] as any,
      ],
    };

    // Handle contract-specific mode
    if (mode === "contract") {
      // Validate contract address format
      if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return NextResponse.json(
          {
            error:
              "Invalid contract address format. Should be 0x followed by 40 hex characters.",
          },
          { status: 400 }
        );
      }

      // Add contract address to the filter
      eventFilter.address = contractAddress.toLowerCase();

      // Set block range - default to all history, but can be limited
      const fromBlockParam = searchParams.get("fromBlock");
      const toBlockParam = searchParams.get("toBlock");

      // If specific block range provided, use it; otherwise use reasonable defaults
      if (fromBlockParam) {
        eventFilter.fromBlock = parseInt(fromBlockParam);
      } else {
        // Default to a large but not excessive range - 30 days of blocks (~1.3M blocks)
        // Note: This is configurable with maxBlocks param
        const maxBlocks = parseInt(searchParams.get("maxBlocks") || "1300000");
        eventFilter.fromBlock = Math.max(0, latestBlock - maxBlocks);
      }

      eventFilter.toBlock = toBlockParam ? parseInt(toBlockParam) : latestBlock;

      console.log(
        `Contract backfill from block ${eventFilter.fromBlock} to ${eventFilter.toBlock}`
      );
    }
    // Handle time-range mode
    else {
      // Determine block range from parameters for time-based mode
      let fromBlock: number;
      let toBlock: number = latestBlock;

      // Check if direct block numbers are provided
      const fromBlockParam = searchParams.get("fromBlock");
      const toBlockParam = searchParams.get("toBlock");

      if (fromBlockParam) {
        // Direct block number provided
        fromBlock = parseInt(fromBlockParam);

        // If toBlock is also provided, use it
        if (toBlockParam) {
          toBlock = parseInt(toBlockParam);
        }

        console.log(`Using provided block range: ${fromBlock} to ${toBlock}`);
      } else {
        // Fall back to hoursAgo calculation
        const hoursAgo = parseInt(searchParams.get("hoursAgo") || "7");
        const timestampFromHoursAgo = getTimestampHoursAgo(hoursAgo);
        fromBlock = await getBlockNumberFromTimestamp(
          provider,
          timestampFromHoursAgo
        );

        console.log(
          `Calculated block range from ${hoursAgo} hours ago: ${fromBlock} to ${toBlock}`
        );
      }

      // Validate block range
      if (fromBlock > toBlock) {
        return NextResponse.json(
          {
            error:
              "Invalid block range: fromBlock must be less than or equal to toBlock",
          },
          { status: 400 }
        );
      }

      if (fromBlock < 0 || toBlock < 0) {
        return NextResponse.json(
          { error: "Invalid block numbers: must be non-negative" },
          { status: 400 }
        );
      }

      eventFilter.fromBlock = fromBlock;
      eventFilter.toBlock = toBlock;

      // Allow filtering by address in time-range mode as well
      const address = searchParams.get("address");
      if (address) {
        eventFilter.address = address;
      }
    }

    // Configure chunking parameters
    const chunkSize = parseInt(searchParams.get("chunkSize") || "500");
    const delayMs = parseInt(searchParams.get("delayMs") || "100");

    // Start tracking the sync run
    syncRunId = await startBlockchainSyncRun({
      jobName: "blockchain-backfill",
      source: `backfill-${mode}`,
      startBlock: Number(eventFilter.fromBlock),
      endBlock: Number(eventFilter.toBlock),
      metadata: {
        contractAddress: eventFilter.address,
        mode,
        chunkSize,
        delayMs,
      },
    });

    // Fetch events using the shared blockchain query service
    const events = await fetchBlockchainEvents(provider, eventFilter, {
      chunkSize,
      delayBetweenChunks: delayMs,
    });

    if (events.length === 0) {
      // Complete the run with zero events
      if (syncRunId) {
        await completeBlockchainSyncRun({
          runId: syncRunId,
          eventsFound: 0,
          blocksProcessed:
            Number(eventFilter.toBlock) - Number(eventFilter.fromBlock) + 1,
        });
      }

      return NextResponse.json({
        message: "No events found in the specified range",
        filter: {
          fromBlock: eventFilter.fromBlock,
          toBlock: eventFilter.toBlock,
          address: eventFilter.address || "any",
        },
      });
    }

    // Check for events that are already in the database
    const newEvents = await filterNewEvents(events, supabase);

    // Process the events using the existing event processor
    // Use 'backfill' as the source
    console.log("Processing events...");
    const result = await processWebhookEvents(events, {
      source: `backfill-${mode}`,
    });

    console.log(
      "Processing complete. Result:",
      JSON.stringify(result, null, 2)
    );

    // Complete the run with results
    if (syncRunId) {
      const eventsSkipped = events.length - newEvents.length;
      const eventsFailed =
        result.results?.filter((r: any) => r.status === "error").length || 0;

      await completeBlockchainSyncRun({
        runId: syncRunId,
        eventsFound: events.length,
        eventsProcessed: result.processed || 0,
        eventsSkipped,
        eventsFailed,
        blocksProcessed:
          Number(eventFilter.toBlock) - Number(eventFilter.fromBlock) + 1,
      });
    }

    return NextResponse.json({
      summary: {
        mode,
        filter: {
          fromBlock: eventFilter.fromBlock,
          toBlock: eventFilter.toBlock,
          address: eventFilter.address || "any",
        },
        eventsFound: events.length,
        newEventsFound: newEvents.length,
        syncRunId,
      },
      result,
    });
  } catch (error: any) {
    console.error("Error processing backfill request:", error);

    // Record failed run
    if (syncRunId) {
      await completeBlockchainSyncRun({
        runId: syncRunId,
        status: "failed",
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      { error: "Failed to process backfill request", details: error.message },
      { status: 500 }
    );
  }
}
