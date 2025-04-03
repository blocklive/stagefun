/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
  serve,
  ServerRequest,
} from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// TODO: Replace with your actual Supabase URL and Anon Key
// It's recommended to use environment variables for these
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// TODO: Add ABIs for your contracts (Factory, Pool, LP, NFT)
// Example: import FactoryAbi from './abis/StageDotFunPoolFactory.json' assert { type: 'json' };

console.log("QuickNode Stream Handler function started.");

// Define expected structure for incoming event data (adjust based on actual payload)
// Based on typical EVM log structure
interface LogEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string; // Usually hex string
  transactionHash: string;
  logIndex: string; // Usually hex string
  removed: boolean; // For reorgs
  // Add other fields provided by QuickNode Logs dataset as needed
}

// Define the expected structure of the incoming webhook payload
interface WebhookPayload {
  data?: LogEvent[]; // Assuming events are nested under a 'data' key
  // Adjust if the payload structure is different (e.g., top-level array)
}

serve(async (req: Request) => {
  // 1. Authentication (Optional but Recommended)
  // You might want to add a secret path or header check
  // to ensure requests are coming only from QuickNode.
  // const requestUrl = new URL(req.url);
  // if (requestUrl.pathname !== `/quicknode-stream-handler/${Deno.env.get('FUNCTION_SECRET')}`) {
  //   return new Response("Unauthorized", { status: 401 });
  // }
  // Or check a header: req.headers.get('X-QuickNode-Signature')

  // 2. Check Request Method
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 3. Parse Request Body
  let events: LogEvent[] = [];
  try {
    const payload: WebhookPayload | LogEvent[] = await req.json();
    // Check if payload is an object with a 'data' key or a direct array
    if (Array.isArray(payload)) {
      events = payload;
    } else if (payload && Array.isArray(payload.data)) {
      events = payload.data;
    }
    console.log(`Received ${events.length} events.`);
    // console.log("Raw payload:", JSON.stringify(rawBody, null, 2)); // Log raw payload for debugging
  } catch (error: any) {
    console.error("Failed to parse request body:", error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }

  // 4. Initialize Supabase Client
  // Important: Use the Service Role Key for backend operations
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase URL or Service Role Key");
    return new Response("Server configuration error", { status: 500 });
  }
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  // 5. Process Events (TODO: Implement Decoding and DB Logic)
  for (const event of events) {
    try {
      const contractAddress = event.address;
      const eventSignature = event.topics[0];
      const isRemoved = event.removed;

      console.log(
        `Processing event from ${contractAddress}, topic: ${eventSignature}, removed: ${isRemoved}, txHash: ${event.transactionHash}`
      );

      // --- Decoding Logic Placeholder ---
      // const ethers = await import('npm:ethers'); // Requires npm specifier support
      // const iface = new ethers.Interface(FactoryAbi); // Or PoolAbi etc.
      // const decodedLog = iface.parseLog(event);

      // --- Database Update Logic Placeholder ---
      if (isRemoved) {
        // Handle reorg: Find corresponding record and potentially revert state or delete
        console.warn(
          `Event from ${contractAddress} (tx: ${event.transactionHash}) was removed due to reorg. Implement revert logic.`
        );
        // Example: Find based on txHash or a combination of fields
        // const { error: deleteError } = await supabaseAdmin
        //  .from('pool_stream')
        //  .delete()
        //  .match({ transaction_hash: event.transactionHash, log_index: parseInt(event.logIndex, 16) }); // Need columns to uniquely identify the event's effect
      } else {
        // Process based on event type (e.g., PoolCreated)
        // if (decodedLog.name === 'PoolCreated') {
        //   const { pool, name, uniqueId, /* other args */ } = decodedLog.args;
        //   await supabaseAdmin.from('pool_stream').insert({
        //      contract_address: pool,
        //      name: name,
        //      unique_id: uniqueId,
        //      // ... map other fields ...
        //   });
        // } else if (/* other events like PoolStatusUpdated */) {
        //    // Find existing pool record by contract_address and update its status
        //    await supabaseAdmin.from('pool_stream')
        //        .update({ status: /* new status */, updated_at: new Date() })
        //        .eq('contract_address', contractAddress);
        // }
        console.log(
          `Placeholder: Processed event ${eventSignature} for ${contractAddress}`
        );
      }
    } catch (error: any) {
      console.error("Error processing event:", event, error);
      // Decide if you want to stop processing or continue with the next event
    }
  }

  // 6. Return Response
  return new Response(
    JSON.stringify({ success: true, processedEvents: events.length }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});

/* 
Supabase Function Deployment Steps:
1. Ensure you have the Supabase CLI installed and linked to your project.
2. Place contract ABIs (e.g., StageDotFunPoolFactory.json) in a subdirectory (e.g., supabase/functions/quicknode-stream-handler/abis/).
3. Set environment variables locally (e.g., in .env file) and on Supabase Dashboard:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY (optional for client-side)
   - SUPABASE_SERVICE_ROLE_KEY (essential for admin access)
   - FUNCTION_SECRET (optional, for webhook security)
4. Deploy the function:
   supabase functions deploy quicknode-stream-handler --no-verify-jwt
5. Get the function's invoke URL from the deployment output or Supabase Dashboard.
6. Configure this URL as the Webhook destination in QuickNode Streams.
*/
