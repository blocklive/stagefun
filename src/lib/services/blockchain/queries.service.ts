import { ethers } from "ethers";

// Define common constants
export const BLOCKS_PER_HOUR = 1800; // ~2 sec block time on Monad

// Event interface
export interface EventFilter {
  topics?: (string | string[] | null)[];
  fromBlock?: string | number;
  toBlock?: string | number;
  address?: string | string[];
}

/**
 * Calculates start block based on hours ago
 */
export function getBlockNumberHoursAgo(
  latestBlock: number,
  hoursAgo: number
): number {
  return Math.max(0, latestBlock - BLOCKS_PER_HOUR * hoursAgo);
}

/**
 * Fetches events from the blockchain in chunks to avoid RPC limits
 */
export async function fetchBlockchainEvents(
  provider: ethers.JsonRpcProvider,
  filter: EventFilter,
  options: {
    chunkSize?: number;
    delayBetweenChunks?: number;
  } = {}
): Promise<any[]> {
  try {
    const fromBlock = Number(filter.fromBlock);
    const toBlock = Number(filter.toBlock);

    // Calculate how many blocks we're trying to query
    const blockRange = toBlock - fromBlock + 1;
    const totalBlocksToProcess = blockRange;

    console.log(
      `==== Starting blockchain query for ${totalBlocksToProcess} blocks (${fromBlock} to ${toBlock}) ====`
    );

    // Alchemy API has a limit of 500 blocks per request
    const ALCHEMY_MAX_BLOCKS = 500;
    const MAX_BLOCK_RANGE = options.chunkSize || ALCHEMY_MAX_BLOCKS;

    console.log(
      `Using max block range of ${MAX_BLOCK_RANGE} blocks per request`
    );

    if (blockRange <= MAX_BLOCK_RANGE) {
      console.log(
        `Fetching events in single request from block ${fromBlock} to ${toBlock}`
      );
      const logs = await provider.getLogs(filter);
      console.log(`Retrieved ${logs.length} logs from the blockchain`);
      return logs;
    }

    // Otherwise, chunk the requests to stay within Alchemy's limit
    console.log(
      `Block range too large (${blockRange} blocks), chunking into ${MAX_BLOCK_RANGE}-block requests...`
    );

    const DELAY_MS = options.delayBetweenChunks || 100; // Delay between chunks
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

      try {
        const logs = await provider.getLogs(chunkFilter);
        allLogs.push(...logs);

        console.log(
          `[Chunk ${chunksProcessed}/${totalChunks}] Found ${logs.length} logs (total so far: ${allLogs.length})`
        );
      } catch (chunkError) {
        console.error(`Error processing chunk ${chunksProcessed}:`, chunkError);
        console.log(`Continuing to next chunk...`);
      }

      // Add a delay between requests to avoid rate limiting
      if (chunkStart + MAX_BLOCK_RANGE <= toBlock) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(
      `==== Blockchain query complete! Processed ${totalBlocksToProcess} blocks and found ${allLogs.length} total logs ====`
    );
    return allLogs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    throw error;
  }
}

/**
 * Compares blockchain events with existing database records to find new events
 */
export async function filterNewEvents(
  events: any[],
  supabase: any
): Promise<any[]> {
  if (events.length === 0) return [];

  console.log(`Checking ${events.length} events against database records`);

  // Get existing events from the database
  const { data: existingEvents } = await supabase
    .from("blockchain_events")
    .select("blockchain_network, transaction_hash, log_index")
    .in(
      "transaction_hash",
      events.map((e) => e.transactionHash)
    );

  // Create a set of existing event keys for fast lookup
  const existingEventKeys = new Set();
  if (existingEvents) {
    existingEvents.forEach(
      (event: {
        blockchain_network: string;
        transaction_hash: string;
        log_index: number;
      }) => {
        const key = `${event.blockchain_network}-${event.transaction_hash}-${event.log_index}`;
        existingEventKeys.add(key);
      }
    );
  }

  // Filter to only new events
  const newEvents = events.filter((event) => {
    const key = `monad-testnet-${event.transactionHash}-${parseInt(
      event.index.toString(),
      16
    )}`;
    return !existingEventKeys.has(key);
  });

  console.log(`Found ${newEvents.length} new events to process`);
  return newEvents;
}

/**
 * Helper function to get ethereum provider
 */
export function getEthersProvider(rpcUrl: string): ethers.JsonRpcProvider {
  if (!rpcUrl) {
    throw new Error("Missing RPC URL");
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}
