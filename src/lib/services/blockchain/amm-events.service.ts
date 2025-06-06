import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { SupabaseClient } from "@supabase/supabase-js";

// AMM Event topic hashes (calculated from event signatures)
export const AMM_EVENT_TOPICS = {
  // PairCreated(address indexed token0, address indexed token1, address pair, uint)
  PAIR_CREATED:
    "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9",

  // Mint(address indexed sender, uint amount0, uint amount1)
  MINT: "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",

  // Burn(address indexed sender, uint amount0, uint amount1, address indexed to)
  BURN: "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496",

  // Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
  SWAP: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",

  // Sync(uint112 reserve0, uint112 reserve1)
  SYNC: "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1",
} as const;

// AMM Contract addresses
export const AMM_CONTRACTS = {
  FACTORY: "0xB6162CcC7E84C18D605c6DFb4c337227C6dC5dF7",
  ROUTER: "0x4B883edfd434d74eBE82FE6dB5f058e6fF08cD53",
} as const;

// Type definitions for AMM events
export interface AmmPairCreatedEvent {
  token0: string;
  token1: string;
  pair: string;
  pairCount: number;
}

export interface AmmMintEvent {
  sender: string;
  amount0: string;
  amount1: string;
  to?: string;
}

export interface AmmBurnEvent {
  sender: string;
  amount0: string;
  amount1: string;
  to: string;
}

export interface AmmSwapEvent {
  sender: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  to: string;
}

export interface AmmSyncEvent {
  reserve0: string;
  reserve1: string;
}

// Helper function to decode event data
function decodeEventData(
  data: string,
  topics: string[],
  eventType: string
): any {
  try {
    // Remove '0x' prefix if present
    const cleanData = data.startsWith("0x") ? data.slice(2) : data;

    switch (eventType) {
      case AMM_EVENT_TOPICS.PAIR_CREATED:
        // PairCreated has indexed token0, token1, and non-indexed pair address and count
        return {
          token0: topics[1] ? `0x${topics[1].slice(26)}` : null,
          token1: topics[2] ? `0x${topics[2].slice(26)}` : null,
          pair: cleanData ? `0x${cleanData.slice(24, 64)}` : null,
          pairCount: cleanData ? parseInt(cleanData.slice(64, 128), 16) : 0,
        };

      case AMM_EVENT_TOPICS.MINT:
        // Mint has indexed sender and non-indexed amounts
        return {
          sender: topics[1] ? `0x${topics[1].slice(26)}` : null,
          amount0: cleanData ? `0x${cleanData.slice(0, 64)}` : "0x0",
          amount1: cleanData ? `0x${cleanData.slice(64, 128)}` : "0x0",
        };

      case AMM_EVENT_TOPICS.BURN:
        // Burn has indexed sender, to and non-indexed amounts
        return {
          sender: topics[1] ? `0x${topics[1].slice(26)}` : null,
          to: topics[2] ? `0x${topics[2].slice(26)}` : null,
          amount0: cleanData ? `0x${cleanData.slice(0, 64)}` : "0x0",
          amount1: cleanData ? `0x${cleanData.slice(64, 128)}` : "0x0",
        };

      case AMM_EVENT_TOPICS.SWAP:
        // Swap has indexed sender, to and non-indexed amounts
        return {
          sender: topics[1] ? `0x${topics[1].slice(26)}` : null,
          to: topics[2] ? `0x${topics[2].slice(26)}` : null,
          amount0In: cleanData ? `0x${cleanData.slice(0, 64)}` : "0x0",
          amount1In: cleanData ? `0x${cleanData.slice(64, 128)}` : "0x0",
          amount0Out: cleanData ? `0x${cleanData.slice(128, 192)}` : "0x0",
          amount1Out: cleanData ? `0x${cleanData.slice(192, 256)}` : "0x0",
        };

      case AMM_EVENT_TOPICS.SYNC:
        // Sync has non-indexed reserves
        return {
          reserve0: cleanData ? `0x${cleanData.slice(0, 64)}` : "0x0",
          reserve1: cleanData ? `0x${cleanData.slice(64, 128)}` : "0x0",
        };

      default:
        return {};
    }
  } catch (error) {
    console.error(`Error decoding ${eventType} event data:`, error);
    return {};
  }
}

// Store raw AMM events in blockchain_events table
async function storeAmmEventsInTable(
  events: any[],
  supabase: SupabaseClient,
  source: string
): Promise<{ eventIds: string[] }> {
  const eventRecords = events.map((event) => ({
    blockchain_network: "monad-testnet",
    block_number: parseInt(event.blockNumber, 16),
    transaction_hash: event.transactionHash,
    log_index: event.logIndex,
    event_topic: event.topics[0],
    contract_address: event.account?.address || event.address,
    raw_event: event,
    status: "pending",
    source,
    related_pool_address: event.account?.address || event.address,
  }));

  // Use upsert to avoid duplicates
  const { data, error } = await supabase
    .from("blockchain_events")
    .upsert(eventRecords, {
      onConflict: "blockchain_network,transaction_hash,log_index",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    console.error("Error storing AMM events:", error);
    throw error;
  }

  return {
    eventIds: data?.map((record: any) => record.id) || [],
  };
}

// Filter out already processed AMM events
async function filterAlreadyProcessedAmmEvents(
  events: any[],
  supabase: SupabaseClient
): Promise<{ uniqueEvents: any[]; skippedEvents: any[] }> {
  if (events.length === 0) {
    return { uniqueEvents: [], skippedEvents: [] };
  }

  // Get transaction hashes to check
  const txHashes = events.map((event) => event.transactionHash);

  // Check which events already exist
  const { data: existingEvents, error } = await supabase
    .from("blockchain_events")
    .select("transaction_hash, log_index")
    .eq("blockchain_network", "monad-testnet")
    .in("transaction_hash", txHashes);

  if (error) {
    console.error("Error checking existing AMM events:", error);
    // If we can't check, process all events to be safe
    return { uniqueEvents: events, skippedEvents: [] };
  }

  // Create lookup keys for existing events
  const existingKeys = new Set(
    existingEvents?.map(
      (record) => `${record.transaction_hash}-${record.log_index}`
    ) || []
  );

  const uniqueEvents: any[] = [];
  const skippedEvents: any[] = [];

  events.forEach((event) => {
    const eventKey = `${event.transactionHash}-${event.logIndex}`;
    if (existingKeys.has(eventKey)) {
      skippedEvents.push({
        event: "amm_event",
        status: "skipped",
        action: "already_processed",
        event_key: eventKey,
      });
    } else {
      uniqueEvents.push(event);
    }
  });

  return { uniqueEvents, skippedEvents };
}

// Handle PairCreated events
async function handlePairCreatedEvent(
  supabase: SupabaseClient,
  event: any,
  isRemoved: boolean,
  blockNumber: number
): Promise<any> {
  try {
    const eventData = decodeEventData(
      event.data,
      event.topics,
      AMM_EVENT_TOPICS.PAIR_CREATED
    );

    if (isRemoved) {
      // Handle reorg - remove the pair
      await supabase
        .from("amm_pairs")
        .delete()
        .eq("pair_address", eventData.pair?.toLowerCase());

      return {
        event: "pair_created",
        status: "removed",
        action: "reorg_removal",
        pair_address: eventData.pair,
      };
    }

    // Insert new pair
    const pairRecord = {
      pair_address: eventData.pair?.toLowerCase(),
      token0_address: eventData.token0?.toLowerCase(),
      token1_address: eventData.token1?.toLowerCase(),
      factory_address: AMM_CONTRACTS.FACTORY.toLowerCase(),
      created_at_block: blockNumber,
      created_at_timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
      total_supply: "0",
      reserve0: "0",
      reserve1: "0",
      created_at: new Date(),
    };

    const { error } = await supabase.from("amm_pairs").insert(pairRecord);

    if (error) {
      console.error("Error inserting pair:", error);
      return {
        event: "pair_created",
        status: "error",
        error: error.message,
      };
    }

    return {
      event: "pair_created",
      status: "success",
      action: "created",
      pair_address: eventData.pair,
      token0: eventData.token0,
      token1: eventData.token1,
    };
  } catch (error: any) {
    console.error("Error handling PairCreated event:", error);
    return {
      event: "pair_created",
      status: "error",
      error: error.message,
    };
  }
}

// Handle transaction events (Mint, Burn, Swap)
async function handleTransactionEvent(
  supabase: SupabaseClient,
  event: any,
  isRemoved: boolean,
  blockNumber: number,
  eventType: string
): Promise<any> {
  try {
    const eventData = decodeEventData(event.data, event.topics, eventType);
    const pairAddress = event.account?.address || event.address;

    if (isRemoved) {
      // Handle reorg - remove the transaction
      await supabase
        .from("amm_transactions")
        .delete()
        .eq("transaction_hash", event.transactionHash)
        .eq("log_index", event.logIndex);

      return {
        event: eventType.toLowerCase(),
        status: "removed",
        action: "reorg_removal",
        transaction_hash: event.transactionHash,
      };
    }

    // Determine event type name
    let eventTypeName: string;
    switch (eventType) {
      case AMM_EVENT_TOPICS.MINT:
        eventTypeName = "mint";
        break;
      case AMM_EVENT_TOPICS.BURN:
        eventTypeName = "burn";
        break;
      case AMM_EVENT_TOPICS.SWAP:
        eventTypeName = "swap";
        break;
      default:
        eventTypeName = "unknown";
    }

    // Insert transaction record
    const transactionRecord = {
      transaction_hash: event.transactionHash,
      block_number: blockNumber,
      timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
      pair_address: pairAddress?.toLowerCase(),
      event_type: eventTypeName,
      user_address:
        eventData.sender?.toLowerCase() || eventData.to?.toLowerCase(),
      amount0: eventData.amount0 || eventData.amount0In || "0",
      amount1: eventData.amount1 || eventData.amount1In || "0",
      amount0_out: eventData.amount0Out || "0",
      amount1_out: eventData.amount1Out || "0",
      liquidity_amount: "0", // Will be calculated separately if needed
      log_index: event.logIndex,
      raw_event_data: JSON.stringify(eventData),
      created_at: new Date(),
    };

    const { error } = await supabase
      .from("amm_transactions")
      .insert(transactionRecord);

    if (error) {
      console.error(`Error inserting ${eventTypeName} transaction:`, error);
      return {
        event: eventTypeName,
        status: "error",
        error: error.message,
      };
    }

    return {
      event: eventTypeName,
      status: "success",
      action: "created",
      transaction_hash: event.transactionHash,
      pair_address: pairAddress,
    };
  } catch (error: any) {
    console.error(`Error handling ${eventType} event:`, error);
    return {
      event: eventType.toLowerCase(),
      status: "error",
      error: error.message,
    };
  }
}

// Handle Sync events (reserve updates)
async function handleSyncEvent(
  supabase: SupabaseClient,
  event: any,
  isRemoved: boolean,
  blockNumber: number
): Promise<any> {
  try {
    const eventData = decodeEventData(
      event.data,
      event.topics,
      AMM_EVENT_TOPICS.SYNC
    );
    const pairAddress = event.account?.address || event.address;

    if (isRemoved) {
      // For sync events, we don't remove but might need to revert to previous state
      // For now, we'll just log it
      return {
        event: "sync",
        status: "removed",
        action: "reorg_removal",
        pair_address: pairAddress,
      };
    }

    // Update pair reserves
    const { error } = await supabase
      .from("amm_pairs")
      .update({
        reserve0: eventData.reserve0,
        reserve1: eventData.reserve1,
        updated_at: new Date(),
        last_sync_block: blockNumber,
        last_sync_timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
      })
      .eq("pair_address", pairAddress?.toLowerCase());

    if (error) {
      console.error("Error updating pair reserves:", error);
      return {
        event: "sync",
        status: "error",
        error: error.message,
      };
    }

    return {
      event: "sync",
      status: "success",
      action: "updated_reserves",
      pair_address: pairAddress,
      reserve0: eventData.reserve0,
      reserve1: eventData.reserve1,
    };
  } catch (error: any) {
    console.error("Error handling Sync event:", error);
    return {
      event: "sync",
      status: "error",
      error: error.message,
    };
  }
}

// Main function to process AMM webhook events
export async function processAmmWebhookEvents(
  events: any[],
  options: { skipEventStorage?: boolean; source?: string } = {}
) {
  if (events.length === 0) {
    return { message: "No events to process", results: [] };
  }

  // Initialize Supabase client
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error: any) {
    console.error("Failed to initialize Supabase client:", error);
    return { error: "Server configuration error", status: 500 };
  }

  // Filter out already processed events
  let uniqueEvents: any[] = [];
  let skippedEvents: Array<{
    event: string;
    status: string;
    action: string;
    [key: string]: any;
  }> = [];

  if (!options.skipEventStorage) {
    const filterResult = await filterAlreadyProcessedAmmEvents(
      events,
      supabase
    );
    uniqueEvents = filterResult.uniqueEvents;
    skippedEvents = filterResult.skippedEvents;
  } else {
    uniqueEvents = [...events];
  }

  if (uniqueEvents.length === 0) {
    return {
      message: "All AMM events already processed",
      processed: 0,
      skipped: skippedEvents.length,
      results: skippedEvents,
    };
  }

  // Store raw events
  let eventIds: string[] = [];
  if (!options.skipEventStorage) {
    try {
      const storeResult = await storeAmmEventsInTable(
        uniqueEvents,
        supabase,
        options.source || "unknown"
      );
      eventIds = storeResult.eventIds || [];
      console.log(
        `Stored ${eventIds.length} AMM events in blockchain_events table`
      );

      // Update status to processing
      if (eventIds.length > 0) {
        await supabase
          .from("blockchain_events")
          .update({
            status: "processing",
            updated_at: new Date(),
          })
          .in("id", eventIds);
      }
    } catch (error) {
      console.error("Error storing AMM events:", error);
    }
  }

  // Process each event
  const results = [...skippedEvents];

  for (const event of uniqueEvents) {
    try {
      const eventTopic = event.topics[0]?.toLowerCase();
      if (!eventTopic) continue;

      const isRemoved = event.removed === true;
      const blockNumber = parseInt(event.blockNumber, 16);

      // Process based on event type
      if (eventTopic === AMM_EVENT_TOPICS.PAIR_CREATED) {
        const result = await handlePairCreatedEvent(
          supabase,
          event,
          isRemoved,
          blockNumber
        );
        results.push(result);
      } else if (eventTopic === AMM_EVENT_TOPICS.MINT) {
        const result = await handleTransactionEvent(
          supabase,
          event,
          isRemoved,
          blockNumber,
          AMM_EVENT_TOPICS.MINT
        );
        results.push(result);
      } else if (eventTopic === AMM_EVENT_TOPICS.BURN) {
        const result = await handleTransactionEvent(
          supabase,
          event,
          isRemoved,
          blockNumber,
          AMM_EVENT_TOPICS.BURN
        );
        results.push(result);
      } else if (eventTopic === AMM_EVENT_TOPICS.SWAP) {
        const result = await handleTransactionEvent(
          supabase,
          event,
          isRemoved,
          blockNumber,
          AMM_EVENT_TOPICS.SWAP
        );
        results.push(result);
      } else if (eventTopic === AMM_EVENT_TOPICS.SYNC) {
        const result = await handleSyncEvent(
          supabase,
          event,
          isRemoved,
          blockNumber
        );
        results.push(result);
      }
    } catch (error: any) {
      console.error("Error processing AMM event:", error);
      results.push({
        event: "unknown",
        status: "error",
        error: error.message,
      } as any);
    }
  }

  // Update event status
  if (!options.skipEventStorage && eventIds.length > 0) {
    try {
      const processedResults = results.slice(skippedEvents.length);
      for (let i = 0; i < eventIds.length && i < processedResults.length; i++) {
        const result = processedResults[i] as any;
        const eventId = eventIds[i];

        let status = "processed";
        let errorMessage = null;

        if (result?.status === "error") {
          status = "failed";
          errorMessage = result.error || "Unknown processing error";
        }

        await supabase
          .from("blockchain_events")
          .update({
            status,
            error_message: errorMessage,
            processed_at: new Date(),
            updated_at: new Date(),
          })
          .eq("id", eventId);
      }

      console.log(
        `Updated status for ${Math.min(
          eventIds.length,
          processedResults.length
        )} processed AMM events`
      );
    } catch (error) {
      console.error("Error updating AMM event status:", error);
    }
  }

  return {
    processed: uniqueEvents.length,
    skipped: skippedEvents.length,
    total: events.length,
    results,
  };
}
