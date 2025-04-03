import { NextRequest, NextResponse } from "next/server";
import { processWebhookEvents } from "@/lib/services/blockchain/events.service";

// Ensure this route runs on the edge runtime
export const runtime = "edge";
export const preferredRegion = "auto";

export async function POST(req: NextRequest) {
  console.log("Starting webhook processing");
  // Optional: Add authentication via a secret query param or header
  // const authHeader = req.headers.get('x-quicknode-signature');
  // if (authHeader !== process.env.QUICKNODE_WEBHOOK_SECRET) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // Parse the incoming webhook payload
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

  // Check environment variables to ensure they are available
  console.log(
    "NEXT_PUBLIC_SUPABASE_URL is set:",
    !!process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  console.log(
    "SUPABASE_SERVICE_ROLE_KEY is set:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Process events using our dedicated service
  console.log("Calling processWebhookEvents with events:", events.length);
  const result = await processWebhookEvents(events);
  console.log("Process result:", JSON.stringify(result, null, 2));

  // Return the response
  return NextResponse.json(result);
}

// Optional: Add a GET handler for health checks
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "QuickNode webhook handler for pool tracking is operational",
  });
}
