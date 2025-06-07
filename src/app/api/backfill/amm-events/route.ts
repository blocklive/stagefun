import { NextRequest, NextResponse } from "next/server";
import {
  AMM_EVENT_TOPICS,
  AMM_CONTRACTS,
  processAmmWebhookEvents,
} from "@/lib/services/blockchain/amm-events.service";
import {
  EventFilter,
  getEthersProvider,
  fetchBlockchainEvents,
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
    // Initialize provider
    const provider = getEthersProvider(
      `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();

    // Determine backfill mode: pair-specific, factory/router, or time-based
    const pairAddress = searchParams.get("pairAddress");
    const includeFactory = searchParams.get("includeFactory") !== "false"; // default true
    const includeRouter = searchParams.get("includeRouter") !== "false"; // default true

    let mode = "timeRange";
    if (pairAddress) {
      mode = "pair";
    }

    console.log(
      `AMM backfill mode: ${mode}${
        pairAddress ? ` for pair ${pairAddress}` : ""
      }`
    );

    // Set up the event filter with Router-based topic filtering
    const skipTopicFilter = searchParams.get("skipTopicFilter") === "true";
    const eventFilter: EventFilter = {};

    if (!skipTopicFilter) {
      // Use dual filtering approach like our webhook:
      // 1. PairCreated events from Factory (no Router filter needed)
      // 2. Transaction events with Router in topics

      // For now, use a simpler approach: filter by all AMM event signatures
      // and let the processing logic handle the Router-specific filtering
      eventFilter.topics = [
        [
          AMM_EVENT_TOPICS.PAIR_CREATED,
          AMM_EVENT_TOPICS.MINT,
          AMM_EVENT_TOPICS.BURN,
          AMM_EVENT_TOPICS.SWAP,
          AMM_EVENT_TOPICS.SYNC,
        ] as any,
      ];

      // Note: We can't easily replicate the OR filtering from webhooks in ethers.js
      // So we'll filter all AMM events and let post-processing handle Router filtering
    }

    console.log(
      `Topic filtering: ${
        skipTopicFilter ? "DISABLED" : "ENABLED with Router filter"
      }`
    );

    // Set up addresses to monitor
    const skipAddressFilter = searchParams.get("skipAddressFilter") === "true";
    const addressesToMonitor: string[] = [];

    if (!skipAddressFilter) {
      if (pairAddress) {
        // Pair-specific mode: only monitor the specific pair
        if (!pairAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          return NextResponse.json(
            {
              error:
                "Invalid pair address format. Should be 0x followed by 40 hex characters.",
            },
            { status: 400 }
          );
        }
        addressesToMonitor.push(pairAddress.toLowerCase());
      } else {
        // General mode: monitor factory and router
        if (includeFactory) {
          addressesToMonitor.push(AMM_CONTRACTS.FACTORY.toLowerCase());
        }
        if (includeRouter) {
          addressesToMonitor.push(AMM_CONTRACTS.ROUTER.toLowerCase());
        }
      }

      if (addressesToMonitor.length === 0) {
        return NextResponse.json(
          { error: "No addresses to monitor specified" },
          { status: 400 }
        );
      }

      // Add addresses to filter
      eventFilter.address = addressesToMonitor;
    }

    console.log(
      `Address filtering: ${skipAddressFilter ? "DISABLED" : "ENABLED"}`
    );
    if (!skipAddressFilter) {
      console.log(`Monitoring addresses: ${addressesToMonitor.join(", ")}`);
    } else {
      console.log("Monitoring ALL contracts (will filter by topics only)");
    }

    // Determine block range from parameters
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
      const hoursAgo = parseInt(searchParams.get("hoursAgo") || "1"); // Default to 1 hour for AMM
      const timestampFromHoursAgo = getTimestampHoursAgo(hoursAgo);
      fromBlock = await getBlockNumberFromTimestamp(
        provider,
        timestampFromHoursAgo
      );

      console.log(
        `Calculated AMM block range from ${hoursAgo} hours ago: ${fromBlock} to ${toBlock}`
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

    // Configure chunking parameters (smaller chunks for AMM due to potentially high volume)
    const chunkSize = parseInt(searchParams.get("chunkSize") || "100");
    const delayMs = parseInt(searchParams.get("delayMs") || "200");

    // Start tracking the sync run
    syncRunId = await startBlockchainSyncRun({
      jobName: "amm-backfill",
      source: `amm-backfill-${mode}`,
      startBlock: Number(eventFilter.fromBlock),
      endBlock: Number(eventFilter.toBlock),
      metadata: {
        addresses: addressesToMonitor,
        mode,
        chunkSize,
        delayMs,
        pairAddress,
        includeFactory,
        includeRouter,
      },
    });

    console.log("🔍 Fetching AMM events...");

    // Fetch events using the shared blockchain query service
    const events = await fetchBlockchainEvents(provider, eventFilter, {
      chunkSize,
      delayBetweenChunks: delayMs,
    });

    console.log(`📊 Found ${events.length} AMM events`);

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
        message: "No AMM events found in the specified range",
        filter: {
          fromBlock: eventFilter.fromBlock,
          toBlock: eventFilter.toBlock,
          addresses: addressesToMonitor,
        },
      });
    }

    // Process the events using our AMM-specific processor
    console.log("🔄 Processing AMM events...");
    const result = await processAmmWebhookEvents(events, {
      source: `amm-backfill-${mode}`,
    });

    console.log(
      "✅ AMM processing complete. Result:",
      JSON.stringify(result, null, 2)
    );

    // Complete the run with results
    if (syncRunId) {
      const eventsFailed =
        result.results?.filter((r: any) => r.status === "error").length || 0;

      await completeBlockchainSyncRun({
        runId: syncRunId,
        eventsFound: events.length,
        eventsProcessed: result.processed || 0,
        eventsSkipped: result.skipped || 0,
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
          addresses: addressesToMonitor,
        },
        eventsFound: events.length,
        syncRunId,
      },
      result,
    });
  } catch (error: any) {
    console.error("❌ Error processing AMM backfill request:", error);

    // Record failed run
    if (syncRunId) {
      await completeBlockchainSyncRun({
        runId: syncRunId,
        status: "failed",
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to process AMM backfill request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
