import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import {
  awardPointsForPoolCreation,
  awardPointsForPoolCommitment,
  awardPointsForPoolExecuting,
  PointType,
} from "../points.service";

// Import the event ABI fragments
const poolCreatedEventFragment = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "address",
      name: "pool",
      type: "address",
    },
    {
      indexed: false,
      internalType: "string",
      name: "name",
      type: "string",
    },
    {
      indexed: false,
      internalType: "string",
      name: "uniqueId",
      type: "string",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "endTime",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "address",
      name: "depositToken",
      type: "address",
    },
    {
      indexed: false,
      internalType: "address",
      name: "owner",
      type: "address",
    },
    {
      indexed: false,
      internalType: "address",
      name: "creator",
      type: "address",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "targetAmount",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "capAmount",
      type: "uint256",
    },
  ],
  name: "PoolCreated",
  type: "event",
};

// TierCommitted event fragment
const tierCommittedEventFragment = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "address",
      name: "user",
      type: "address",
    },
    {
      indexed: true,
      internalType: "uint256",
      name: "tierId",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "amount",
      type: "uint256",
    },
  ],
  name: "TierCommitted",
  type: "event",
};

// PoolStatusUpdated event fragment
const poolStatusUpdatedEventFragment = {
  anonymous: false,
  inputs: [
    {
      indexed: false,
      internalType: "uint8",
      name: "newStatus",
      type: "uint8",
    },
  ],
  name: "PoolStatusUpdated",
  type: "event",
};

// Define event constants
export const EVENT_TOPICS = {
  POOL_CREATED:
    "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e",
  TIER_COMMITTED:
    "0xd9861a9641141da7a608bb821575da486cc59cac5cf3f24e644633d8b9a051b5",
  POOL_STATUS_UPDATED:
    "0x83f00c5c08fb55fde46aa16f1732a744093b07a1ca3909114ec61b978d4e5458",
};

// Map from contract status numbers to database status strings
const STATUS_MAP: Record<number, string> = {
  0: "INACTIVE",
  1: "ACTIVE",
  2: "PAUSED",
  3: "CLOSED",
  4: "FUNDED",
  5: "FULLY_FUNDED",
  6: "FAILED",
  7: "EXECUTING",
  8: "COMPLETED",
  9: "CANCELLED",
};

// Initialize interface for decoding events
const eventIface = new ethers.Interface([
  poolCreatedEventFragment,
  tierCommittedEventFragment,
  poolStatusUpdatedEventFragment,
]);

// Helper function to create a Supabase client
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials in environment variables");
  }

  console.log("Creating Supabase admin client");

  // Create a client with the admin key to bypass RLS
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to convert unix timestamp to ISO date string
export function timestampToISODate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

// Handle PoolCreated events
export async function handlePoolCreatedEvent(
  supabase: any,
  event: any,
  isRemoved: boolean,
  blockNumber: number
) {
  if (isRemoved) {
    // If this is a reorg (removed event), we need to delete the corresponding pool record
    const { error } = await supabase.from("pool_stream").delete().match({
      blockchain_tx_hash: event.transactionHash,
    });

    if (error) {
      console.error("Error handling removed PoolCreated event:", error);
      return {
        event: "PoolCreated",
        status: "error",
        action: "delete",
        error: error.message,
      };
    } else {
      console.log(
        `Successfully deleted pool for removed event in tx: ${event.transactionHash}`
      );
      return {
        event: "PoolCreated",
        status: "success",
        action: "delete",
      };
    }
  } else {
    try {
      // First, check if we've already processed this transaction to ensure idempotency
      const { data: existingPool, error: findError } = await supabase
        .from("pool_stream")
        .select("id, contract_address, name")
        .eq("blockchain_tx_hash", event.transactionHash)
        .maybeSingle();

      if (findError) {
        console.error("Error checking for existing pool record:", findError);
      } else if (existingPool) {
        console.log(
          `Pool creation transaction ${event.transactionHash} already processed, skipping. Pool: ${existingPool.contract_address} (${existingPool.name})`
        );
        return {
          event: "PoolCreated",
          status: "success",
          action: "skip_duplicate",
          pool: existingPool.contract_address,
          name: existingPool.name,
        };
      }

      // If we get here, the pool hasn't been processed yet - decode the event and continue
      const log = {
        topics: event.topics,
        data: event.data,
      };

      const decodedLog = eventIface.parseLog(log);
      if (!decodedLog) {
        throw new Error("Failed to decode PoolCreated event");
      }

      // Extract the data we need for our table
      const pool = decodedLog.args[0].toLowerCase();
      const name = decodedLog.args[1];
      const uniqueId = decodedLog.args[2];
      const endTime = Number(decodedLog.args[3]);
      const depositToken = decodedLog.args[4].toLowerCase();
      const owner = decodedLog.args[5].toLowerCase();
      const creator = decodedLog.args[6].toLowerCase();
      const targetAmount = decodedLog.args[7].toString();
      const capAmount = decodedLog.args[8].toString();

      // Insert the new pool into our pool_stream table
      const { error } = await supabase.from("pool_stream").insert({
        name: name,
        unique_id: uniqueId,
        creator_address: creator,
        contract_address: pool,
        target_amount: targetAmount,
        cap_amount: capAmount !== "0" ? capAmount : null,
        ends_at: timestampToISODate(endTime),
        status: "ACTIVE", // Default to ACTIVE as per contract's PoolStatus.ACTIVE (1)
        currency: "USDC", // Assuming the depositToken is USDC

        // Transaction metadata
        last_processed_block_number: blockNumber,
        blockchain_tx_hash: event.transactionHash,
        blockchain_network: "monad-testnet",
      });

      if (error) {
        console.error("Error inserting PoolCreated event:", error);
        return {
          event: "PoolCreated",
          status: "error",
          action: "insert",
          error: error.message,
        };
      } else {
        console.log(
          `Successfully processed PoolCreated event for pool: ${pool}`
        );

        // Award points to the creator for creating a pool
        try {
          await awardPointsForPoolCreation({
            creatorAddress: creator,
            poolAddress: pool,
            poolName: name,
            uniqueId,
            txHash: event.transactionHash,
            supabase,
          });
        } catch (pointsError: any) {
          console.error(
            "Error awarding points for pool creation:",
            pointsError
          );
        }

        return {
          event: "PoolCreated",
          status: "success",
          action: "insert",
          pool,
          name,
        };
      }
    } catch (error: any) {
      console.error("Error decoding PoolCreated event:", error);
      return {
        event: "PoolCreated",
        status: "error",
        action: "decode",
        error: error.message,
      };
    }
  }
}

// Handle TierCommitted events
export async function handleTierCommittedEvent(
  supabase: any,
  event: any,
  isRemoved: boolean,
  blockNumber: number
) {
  if (isRemoved) {
    // Handle reorg for TierCommitted event
    const { error } = await supabase.from("tier_commitments").delete().match({
      blockchain_tx_hash: event.transactionHash,
    });

    if (error) {
      console.error("Error handling removed TierCommitted event:", error);
      return {
        event: "TierCommitted",
        status: "error",
        action: "delete",
        error: error.message,
      };
    } else {
      console.log(
        `Successfully deleted tier commitment for removed event in tx: ${event.transactionHash}`
      );
      return {
        event: "TierCommitted",
        status: "success",
        action: "delete",
      };
    }
  } else {
    try {
      // Extract data directly from the event
      console.log(
        "Processing TierCommitted event:",
        JSON.stringify(event, null, 2)
      );

      // Extract user address from topic 1 (remove padding)
      const user = "0x" + event.topics[1].slice(26).toLowerCase();

      // Extract tier ID from topic 2
      const tierId = parseInt(event.topics[2], 16);

      // Extract amount from data field
      const amount = parseInt(event.data, 16).toString();

      // The pool address is the contract that emitted the event
      const poolAddress = event.address.toLowerCase();

      console.log(
        `Extracted data: user=${user}, tierId=${tierId}, amount=${amount}, pool=${poolAddress}`
      );

      const tierCommitment = {
        user_address: user,
        pool_address: poolAddress,
        tier_id: tierId,
        amount: amount,
        committed_at: new Date().toISOString(),
        last_processed_block_number: blockNumber,
        blockchain_tx_hash: event.transactionHash,
        blockchain_network: "monad-testnet",
      };

      console.log("Inserting tier commitment:", tierCommitment);

      // Simple direct insert with admin key
      const response = await supabase
        .from("tier_commitments")
        .insert(tierCommitment);

      console.log("Insert response:", JSON.stringify(response, null, 2));

      // If there's an error with code 23505, it's a unique constraint violation,
      // which means we've already processed this transaction hash before
      if (response.error) {
        if (response.error.code === "23505") {
          console.log(
            `Transaction ${event.transactionHash} already processed, skipping amount updates.`
          );
          return {
            event: "TierCommitted",
            status: "success",
            action: "skip_duplicate",
            user,
            tierId,
            poolAddress,
          };
        } else {
          console.error("Error inserting TierCommitted event:", response.error);
          return {
            event: "TierCommitted",
            status: "error",
            action: "insert",
            error: response.error.message,
            details: response.error,
          };
        }
      }

      // THE INSERT SUCCEEDED, SO THIS IS THE FIRST TIME WE'VE SEEN THIS EVENT
      // Now we can safely update amounts without risk of double-counting

      // ADDITION 1: Update the pool's raised_amount
      try {
        // First, get the current pool to update its raised_amount
        const { data: poolData, error: poolFetchError } = await supabase
          .from("pools")
          .select("raised_amount")
          .ilike("contract_address", poolAddress)
          .maybeSingle();

        if (poolFetchError) {
          console.error(
            "Error fetching pool for raised_amount update:",
            poolFetchError
          );
        } else if (poolData) {
          // Calculate new raised amount - keep in base units
          const currentRaisedAmount = poolData.raised_amount
            ? BigInt(poolData.raised_amount)
            : BigInt(0);
          const newRaisedAmount = currentRaisedAmount + BigInt(amount);

          // Update the pool's raised_amount
          const { error: poolUpdateError } = await supabase
            .from("pools")
            .update({ raised_amount: newRaisedAmount.toString() })
            .ilike("contract_address", poolAddress);

          if (poolUpdateError) {
            console.error(
              "Error updating pool raised_amount:",
              poolUpdateError
            );
          } else {
            console.log(
              `Updated pool ${poolAddress} raised_amount to ${newRaisedAmount.toString()} (base units)`
            );
          }
        } else {
          console.log(`Pool not found with address ${poolAddress}`);
        }
      } catch (poolUpdateError: any) {
        console.error("Error in pool raised_amount update:", poolUpdateError);
      }

      // ADDITION 2: Update the user's funded_amount in the users table
      try {
        // First, find the user by smart_wallet_address case-insensitive
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("id, funded_amount")
          .ilike("smart_wallet_address", user) // Case-insensitive search
          .maybeSingle();

        if (userFetchError) {
          console.error(
            "Error fetching user for funded_amount update:",
            userFetchError
          );
        } else if (userData) {
          // Calculate new funded amount - keep in base units
          const currentFundedAmount = userData.funded_amount
            ? BigInt(userData.funded_amount)
            : BigInt(0);
          const newFundedAmount = currentFundedAmount + BigInt(amount);

          // Update the user's funded_amount
          const { error: userUpdateError } = await supabase
            .from("users")
            .update({ funded_amount: newFundedAmount.toString() })
            .eq("id", userData.id);

          if (userUpdateError) {
            console.error(
              "Error updating user funded_amount:",
              userUpdateError
            );
          } else {
            console.log(
              `Updated user ${
                userData.id
              } funded_amount to ${newFundedAmount.toString()} (base units)`
            );

            // Award points for committing to a pool
            try {
              await awardPointsForPoolCommitment({
                userAddress: user,
                poolAddress,
                tierId,
                amount: amount.toString(),
                txHash: event.transactionHash,
                supabase,
              });
            } catch (pointsError: any) {
              console.error(
                "Error awarding points for pool commitment:",
                pointsError
              );
            }
          }
        } else {
          console.log(`User not found with wallet address ${user}`);
        }
      } catch (userUpdateError: any) {
        console.error("Error in user funded_amount update:", userUpdateError);
      }

      console.log(
        `Successfully processed TierCommitted event for user: ${user}, tier: ${tierId}, pool: ${poolAddress}`
      );

      return {
        event: "TierCommitted",
        status: "success",
        action: "insert",
        user,
        tierId,
        poolAddress,
      };
    } catch (error: any) {
      console.error("Error processing TierCommitted event:", error);
      return {
        event: "TierCommitted",
        status: "error",
        action: "process",
        error: error.message,
      };
    }
  }
}

// Handle PoolStatusUpdated events
export async function handlePoolStatusUpdatedEvent(
  supabase: any,
  event: any,
  isRemoved: boolean,
  blockNumber: number
) {
  if (isRemoved) {
    // Status events don't make sense to delete/revert since they're state changes
    // We'll just log this occurrence but not take any action
    console.log(
      `Ignoring removed PoolStatusUpdated event in tx: ${event.transactionHash}`
    );
    return {
      event: "PoolStatusUpdated",
      status: "ignored",
      action: "delete",
      reason: "Status events are not reverted on chain reorgs",
    };
  } else {
    try {
      // Decode the event data to get the new status
      const log = {
        topics: event.topics,
        data: event.data,
      };

      // Try to decode using ethers interface
      let statusNum;
      try {
        const decodedLog = eventIface.parseLog(log);
        if (!decodedLog) {
          throw new Error("Failed to decode PoolStatusUpdated event");
        }
        statusNum = Number(decodedLog.args[0]);
      } catch (decodeError) {
        // Fallback to manual decoding if ethers fails
        console.log("Falling back to manual decoding for status event");
        const statusHex = event.data.slice(0, 66);
        statusNum = parseInt(statusHex, 16);
      }

      const statusString = STATUS_MAP[statusNum] || "UNKNOWN";

      // The pool address is the contract that emitted the event
      const poolAddress = event.address.toLowerCase();

      // Update pool status using case-insensitive match
      const { error } = await supabase
        .from("pools")
        .update({
          status: statusString,
        })
        .ilike("contract_address", poolAddress);

      if (error) {
        console.error("Error updating pool status:", error);
        return {
          event: "PoolStatusUpdated",
          status: "error",
          action: "update",
          error: error.message,
        };
      }

      console.log(
        `Successfully updated status for pool: ${poolAddress} to ${statusString}`
      );

      // If the pool status was updated to EXECUTING (7), award bonus points to creator
      if (statusNum === 7) {
        // EXECUTING
        try {
          await awardPointsForPoolExecuting({
            poolAddress,
            statusNum,
            statusString,
            txHash: event.transactionHash,
            supabase,
          });
        } catch (pointsError: any) {
          console.error(
            "Error awarding bonus points for executing pool:",
            pointsError
          );
        }
      }

      return {
        event: "PoolStatusUpdated",
        status: "success",
        action: "update",
        pool: poolAddress,
        newStatus: statusString,
        statusNum,
      };
    } catch (error: any) {
      console.error("Error processing PoolStatusUpdated event:", error);
      return {
        event: "PoolStatusUpdated",
        status: "error",
        action: "process",
        error: error.message,
      };
    }
  }
}

// Process webhook events
export async function processWebhookEvents(
  events: any[],
  options: { skipEventStorage?: boolean; source?: string } = {}
) {
  if (events.length === 0) {
    return { message: "No events to process", results: [] };
  }

  // Initialize Supabase client with admin key
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (error: any) {
    console.error("Failed to initialize Supabase client:", error);
    return { error: "Server configuration error", status: 500 };
  }

  // Step 1: Store raw events in blockchain_events table for tracking (unless explicitly skipped)
  let eventIds: string[] = [];
  if (!options.skipEventStorage) {
    try {
      const storeResult = await storeEventsInTable(
        events,
        supabase,
        options.source || "unknown"
      );
      eventIds = storeResult.eventIds || [];
      console.log(
        `Stored ${eventIds.length} events in blockchain_events table`
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
      console.error("Error storing events in blockchain_events table:", error);
      // Continue with processing even if storage fails
    }
  }

  // Step 2: Process each event as before
  const results = [];

  for (const event of events) {
    try {
      // Skip events that don't match our known event signatures
      const eventTopic = event.topics[0]?.toLowerCase();
      if (!eventTopic) continue;

      // Check for reorg (removed events)
      const isRemoved = event.removed === true;

      // Convert hex blockNumber to integer
      const blockNumber = parseInt(event.blockNumber, 16);

      // Process based on event type
      if (eventTopic === EVENT_TOPICS.POOL_CREATED) {
        const poolResult = await handlePoolCreatedEvent(
          supabase,
          event,
          isRemoved,
          blockNumber
        );
        results.push(poolResult);
      } else if (eventTopic === EVENT_TOPICS.TIER_COMMITTED) {
        const tierResult = await handleTierCommittedEvent(
          supabase,
          event,
          isRemoved,
          blockNumber
        );
        results.push(tierResult);
      } else if (eventTopic === EVENT_TOPICS.POOL_STATUS_UPDATED) {
        const statusResult = await handlePoolStatusUpdatedEvent(
          supabase,
          event,
          isRemoved,
          blockNumber
        );
        results.push(statusResult);
      }
    } catch (error: any) {
      console.error("Error processing event:", error);
      results.push({
        event: "unknown",
        status: "error",
        error: error.message,
      });
    }
  }

  // Step 3: Update the status of events in blockchain_events table
  if (!options.skipEventStorage && eventIds.length > 0) {
    try {
      // Match events with results
      for (let i = 0; i < eventIds.length && i < results.length; i++) {
        const result = results[i];
        const eventId = eventIds[i];

        // Determine status based on result
        let status = "processed";
        let errorMessage = null;

        if (result?.status === "error") {
          status = "failed";
          errorMessage = result.error || "Unknown processing error";
        }

        // Update individual event status
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
          results.length
        )} processed events`
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      // We don't throw here, as this is a post-processing step
    }
  }

  return {
    processed: events.length,
    results,
  };
}

/**
 * Store events in the blockchain_events table
 */
async function storeEventsInTable(
  events: any[],
  supabase: any,
  source: string = "unknown"
): Promise<{ inserted: number; eventIds: string[] }> {
  if (events.length === 0) return { inserted: 0, eventIds: [] };

  try {
    const eventsToInsert = events.map((event) => {
      const eventTopic = event.topics[0]?.toLowerCase();
      let relatedPoolAddress = null;
      let relatedUserAddress = null;

      // Extract related addresses based on event type
      if (eventTopic) {
        // The pool address is the contract that emitted the event
        relatedPoolAddress = event.address.toLowerCase();

        // For TierCommitted events, extract the user address from topic 1
        if (eventTopic === EVENT_TOPICS.TIER_COMMITTED && event.topics[1]) {
          relatedUserAddress = "0x" + event.topics[1].slice(26).toLowerCase();
        }
      }

      return {
        blockchain_network: "monad-testnet",
        block_number: parseInt(event.blockNumber, 16),
        transaction_hash: event.transactionHash,
        log_index: parseInt(event.index?.toString() || event.logIndex, 16),
        event_topic: eventTopic || "unknown",
        contract_address: event.address.toLowerCase(),
        raw_event: event,
        status: "pending",
        source: source,
        related_pool_address: relatedPoolAddress,
        related_user_address: relatedUserAddress,
      };
    });

    // Use upsert to avoid duplicate key errors
    const { data, error } = await supabase
      .from("blockchain_events")
      .upsert(eventsToInsert, {
        onConflict: "blockchain_network,transaction_hash,log_index",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("Error storing events in blockchain_events:", error);
      return { inserted: 0, eventIds: [] };
    }

    return {
      inserted: data?.length || 0,
      eventIds: data?.map((row: { id: string }) => row.id) || [],
    };
  } catch (error) {
    console.error("Error in storeEventsInTable:", error);
    return { inserted: 0, eventIds: [] };
  }
}
