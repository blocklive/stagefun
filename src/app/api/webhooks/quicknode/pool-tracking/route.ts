import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

// Ensure this route runs on the edge runtime
export const runtime = "edge";
export const preferredRegion = "auto";

// Topics for each event type we want to handle
const POOL_CREATED_TOPIC =
  "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e";

// ABI fragments for events we're handling
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

// Initialize JSON interface for decoding events
const iface = new ethers.Interface([poolCreatedEventFragment]);

// Helper function to create a Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials in environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }, // Required for server-side usage
  });
}

// Helper to convert unix timestamp to ISO date string
function timestampToISODate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  // Optional: Add authentication via a secret query param or header
  // const authHeader = req.headers.get('x-quicknode-signature');
  // if (authHeader !== process.env.QUICKNODE_WEBHOOK_SECRET) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // 1. Parse the incoming webhook payload
  let events = [];
  try {
    const data = await req.json();

    // Add detailed logging of the raw payload
    console.log("=== QuickNode Webhook Raw Payload ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("===================================");

    // Handle the payload format we received from QuickNode
    // The filter returns an array of logs directly
    events = Array.isArray(data) ? data : [];

    console.log(`Received ${events.length} events from QuickNode webhook`);

    // Log details of each event for debugging
    if (events.length > 0) {
      console.log("=== Event Details ===");
      events.forEach((event, index) => {
        console.log(`Event #${index + 1}:`);
        console.log(`- Transaction Hash: ${event.transactionHash}`);
        console.log(
          `- Block Number: ${event.blockNumber} (${parseInt(
            event.blockNumber,
            16
          )})`
        );
        console.log(`- Topics: ${JSON.stringify(event.topics)}`);
        console.log(`- Address: ${event.address}`);
        console.log(
          `- Data: ${event.data.substring(0, 100)}${
            event.data.length > 100 ? "..." : ""
          }`
        );
        console.log(`- Removed: ${event.removed || false}`);
        console.log("---");
      });
      console.log("===================");
    }
  } catch (error: any) {
    console.error("Failed to parse webhook payload:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (events.length === 0) {
    return NextResponse.json({ message: "No events to process" });
  }

  // 2. Initialize Supabase client
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (error: any) {
    console.error("Failed to initialize Supabase client:", error);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // 3. Process each event
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
      if (eventTopic === POOL_CREATED_TOPIC) {
        // Handle PoolCreated event
        if (isRemoved) {
          // If this is a reorg (removed event), we need to delete the corresponding pool record
          // We can identify it by transaction hash or a combination of block number and log index
          const { error } = await supabase.from("pool_stream").delete().match({
            blockchain_tx_hash: event.transactionHash,
          });

          if (error) {
            console.error("Error handling removed PoolCreated event:", error);
            results.push({
              event: "PoolCreated",
              status: "error",
              action: "delete",
              error: error.message,
            });
          } else {
            console.log(
              `Successfully deleted pool for removed event in tx: ${event.transactionHash}`
            );
            results.push({
              event: "PoolCreated",
              status: "success",
              action: "delete",
            });
          }
        } else {
          // This is a new or confirmed event
          try {
            // Decode the event data
            // We need to recreate the log format expected by ethers
            const log = {
              topics: event.topics,
              data: event.data,
            };

            const decodedLog = iface.parseLog(log);
            if (!decodedLog) {
              throw new Error("Failed to decode PoolCreated event");
            }

            // Extract the data we need for our table
            const pool = decodedLog.args[0].toLowerCase(); // Make sure to normalize addresses to lowercase
            const name = decodedLog.args[1];
            const uniqueId = decodedLog.args[2];
            const endTime = Number(decodedLog.args[3]);
            const depositToken = decodedLog.args[4].toLowerCase();
            const owner = decodedLog.args[5].toLowerCase();
            const creator = decodedLog.args[6].toLowerCase();
            const targetAmount = decodedLog.args[7].toString();
            const capAmount = decodedLog.args[8].toString();

            // The LP token and NFT contract addresses might require querying the pool contract
            // For now we'll leave them null and update them later if needed

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
              last_processed_block_number: blockNumber, // Use this field for the block number
              blockchain_tx_hash: event.transactionHash,
              blockchain_network: "monad-testnet",
            });

            if (error) {
              console.error("Error inserting new pool:", error);
              results.push({
                event: "PoolCreated",
                status: "error",
                action: "insert",
                error: error.message,
              });
            } else {
              console.log(`Successfully inserted new pool: ${pool} (${name})`);
              results.push({
                event: "PoolCreated",
                status: "success",
                action: "insert",
                pool: {
                  address: pool,
                  name: name,
                  uniqueId: uniqueId,
                },
              });

              // TODO: If needed, make an additional call here to update the QuickNode stream filter
              // to add the new pool address to the monitored addresses list
            }
          } catch (decodeError: any) {
            console.error("Error decoding PoolCreated event:", decodeError);
            results.push({
              event: "PoolCreated",
              status: "error",
              action: "decode",
              error: decodeError.message,
            });
          }
        }
      }
      // Add more event handlers here for other events (PoolStatusUpdated, TierCommitted, etc.)
    } catch (eventError: any) {
      console.error("Error processing event:", eventError);
      results.push({ status: "error", error: eventError.message });
    }
  }

  // 4. Return a summary of what we processed
  return NextResponse.json({
    processed: events.length,
    results: results,
  });
}

// Optional: Add a GET handler for health checks
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "QuickNode webhook handler for pool tracking is operational",
  });
}
