import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  EVENT_TOPICS,
  processWebhookEvents,
} from "@/lib/services/blockchain/events.service";

// Monad Testnet RPC URL should come from environment variable for security
const MONAD_RPC_URL = process.env.MONAD_TESTNET_RPC_URL;

// Default is to require API key for protection, can be disabled in dev
const BACKFILL_API_KEY = process.env.BACKFILL_API_KEY;

// Event interface
interface EventFilter {
  topics: string[];
  fromBlock?: string | number;
  toBlock?: string | number;
  address?: string | string[];
}

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
  provider: ethers.JsonRpcProvider,
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

/**
 * Fetches event logs from the blockchain in chunks to avoid RPC limits
 */
async function fetchEvents(
  provider: ethers.JsonRpcProvider,
  filter: EventFilter
): Promise<any[]> {
  try {
    const fromBlock = Number(filter.fromBlock);
    const toBlock = Number(filter.toBlock);

    // Calculate how many blocks we're trying to query
    const blockRange = toBlock - fromBlock + 1;
    const totalBlocksToProcess = blockRange;

    console.log(
      `==== Starting backfill for ${totalBlocksToProcess} blocks (${fromBlock} to ${toBlock}) ====`
    );

    // If range is small enough, make a single request
    if (blockRange <= 100) {
      console.log(
        `Fetching events in single request from block ${fromBlock} to ${toBlock}`
      );
      const logs = await provider.getLogs(filter);
      console.log(`Retrieved ${logs.length} logs from the blockchain`);
      return logs;
    }

    // Otherwise, chunk the requests to stay within provider limits
    console.log(
      `Block range too large (${blockRange} blocks), chunking into smaller requests...`
    );

    const MAX_BLOCK_RANGE = 100; // Maximum blocks per request
    const allLogs: any[] = [];

    // Calculate number of chunks needed
    const totalChunks = Math.ceil(blockRange / MAX_BLOCK_RANGE);
    console.log(
      `Will process ${totalChunks} chunks of up to ${MAX_BLOCK_RANGE} blocks each`
    );

    let chunksProcessed = 0;
    let blocksProcessed = 0;

    // Process in chunks of MAX_BLOCK_RANGE blocks
    for (
      let chunkStart = fromBlock;
      chunkStart <= toBlock;
      chunkStart += MAX_BLOCK_RANGE
    ) {
      const chunkEnd = Math.min(chunkStart + MAX_BLOCK_RANGE - 1, toBlock);
      const chunkSize = chunkEnd - chunkStart + 1;

      chunksProcessed++;
      blocksProcessed += chunkSize;

      // Calculate progress
      const percentComplete = (
        (blocksProcessed / totalBlocksToProcess) *
        100
      ).toFixed(1);

      console.log(
        `[Chunk ${chunksProcessed}/${totalChunks} - ${percentComplete}% complete] Processing blocks ${chunkStart} to ${chunkEnd} (${chunkSize} blocks)`
      );

      // Create a filter for this chunk
      const chunkFilter = {
        ...filter,
        fromBlock: chunkStart,
        toBlock: chunkEnd,
      };

      const logs = await provider.getLogs(chunkFilter);
      allLogs.push(...logs);

      console.log(
        `[Chunk ${chunksProcessed}/${totalChunks}] Found ${logs.length} logs (total so far: ${allLogs.length})`
      );

      // Add a delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300)); // Increased from 100ms to 200ms
    }

    console.log(
      `==== Backfill complete! Processed ${totalBlocksToProcess} blocks and found ${allLogs.length} total logs ====`
    );
    return allLogs;
  } catch (error) {
    console.error("Error fetching logs:", error);
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

  if (!MONAD_RPC_URL) {
    return NextResponse.json(
      { error: "MONAD_RPC_URL environment variable not configured" },
      { status: 500 }
    );
  }

  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();

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

    // Create filter for all relevant event topics
    const eventFilter: EventFilter = {
      topics: [
        [
          EVENT_TOPICS.POOL_CREATED,
          EVENT_TOPICS.TIER_COMMITTED,
          EVENT_TOPICS.POOL_STATUS_UPDATED,
        ] as any, // Type assertion to avoid TypeScript error with array of strings
      ],
      fromBlock,
      toBlock,
    };

    // Allow filtering by address if specified
    const address = searchParams.get("address");
    if (address) {
      eventFilter.address = address;
    }

    // Fetch the events
    const events = await fetchEvents(provider, eventFilter);
    if (events.length === 0) {
      return NextResponse.json({
        message: "No events found in the specified range",
        blockRange: { fromBlock, toBlock },
      });
    }

    // Process the events using the existing event processor
    console.log("Processing events...", events);
    const result = await processWebhookEvents(events);
    console.log(
      "Processing complete. Result:",
      JSON.stringify(result, null, 2)
    );

    return NextResponse.json({
      summary: {
        blockRange: {
          fromBlock,
          toBlock,
        },
        eventsFound: events.length,
      },
      result,
    });
  } catch (error: any) {
    console.error("Error processing backfill request:", error);
    return NextResponse.json(
      { error: "Failed to process backfill request", details: error.message },
      { status: 500 }
    );
  }
}
