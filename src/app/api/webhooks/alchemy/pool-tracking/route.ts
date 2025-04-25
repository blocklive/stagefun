import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

// Placeholder for your Alchemy Webhook Signing Key (Store securely in environment variables!)
const ALCHEMY_SIGNING_KEY = process.env.ALCHEMY_POOL_TRACKING_SIGNING_KEY;

// Placeholder: Define the expected shape of the Alchemy webhook payload
// You'll need to refine this based on the actual data received from Alchemy
interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string; // e.g., "GRAPHQL"
  event: {
    // This structure depends heavily on your GraphQL query
    data?: {
      block?: {
        logs?: AlchemyLog[];
        // other block fields if requested...
      };
      // other top-level fields if requested...
    };
    sequenceNumber?: string;
  };
}

interface AlchemyLog {
  data: string;
  topics: string[];
  index: number;
  account: {
    address: string;
  };
  transaction: {
    hash: string;
    index: number;
    from: {
      address: string;
    };
    to: {
      address: string;
    };
    value: string;
    gasUsed: number;
    status: number;
  };
  blockNumber?: string; // Optional as it might come from block object
  blockHash?: string; // Optional as it might come from block object
  removed?: boolean; // Optional for reorg detection
}

// Function to verify the signature (implementation from Alchemy docs)
// Reference: https://docs.alchemy.com/reference/notify-api-quickstart#validate-the-signature-received
async function isValidSignature(
  request: NextRequest,
  rawBody: string
): Promise<boolean> {
  // In Next.js App Router, headers() returns a Promise<ReadonlyHeaders>
  const headerList = request.headers;
  const signature = headerList.get("x-alchemy-signature");

  if (!signature || !ALCHEMY_SIGNING_KEY) {
    console.error(
      "Signature validation failed: Missing signature or signing key."
    );
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", ALCHEMY_SIGNING_KEY);
    hmac.update(rawBody, "utf8");
    const digest = hmac.digest("hex");
    const isValid = signature === digest;
    if (!isValid) {
      console.warn("Signature validation failed: Digest mismatch.");
    }
    return isValid;
  } catch (error) {
    console.error("Error during signature validation:", error);
    return false;
  }
}

// Placeholder for your adapted event processing logic
// It should accept Alchemy's log format
async function processAlchemyWebhookEvents(events: AlchemyLog[]) {
  console.log(`Processing ${events.length} events from Alchemy...`);

  // Import the processWebhookEvents function from your events service
  const { processWebhookEvents } = await import(
    "@/lib/services/blockchain/events.service"
  );

  // Transform Alchemy events to QuickNode format
  const transformedEvents = events.map((event) => {
    console.log(event); // Log for debugging purposes

    // Transform each Alchemy event to match the expected format for processWebhookEvents
    return {
      // Core event data
      address: event.account.address.toLowerCase(), // Convert to lowercase for consistency
      topics: event.topics,
      data: event.data,

      // Transaction and block info
      transactionHash: event.transaction.hash,
      blockNumber: event.blockNumber || "0x0", // If blockNumber is missing, provide a default
      logIndex: `0x${event.index.toString(16)}`, // Convert to hex string with 0x prefix

      // Additional fields that might be needed
      removed: event.removed || false, // Default to false if not provided

      // These fields might also be needed depending on your event processing logic
      blockHash: event.blockHash || "",
      transactionIndex: `0x${event.transaction.index.toString(16)}`,

      // Pass the original index for consistent identification
      index: event.index,

      // Add any other fields required by your specific implementation
    };
  });

  // Call the existing processWebhookEvents function with transformed data
  // Specify source as 'webhook' for tracking
  const result = await processWebhookEvents(transformedEvents, {
    source: "webhook",
  });

  return result;
}

export async function POST(req: NextRequest) {
  console.log("Received Alchemy webhook request");

  let rawBody: string;
  try {
    rawBody = await req.text(); // Read the raw body for signature validation
  } catch (error) {
    console.error("Failed to read request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // --- Signature Verification ---
  if (!(await isValidSignature(req, rawBody))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("Alchemy signature verified successfully.");

  // --- Payload Parsing ---
  let payload: AlchemyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);

    // Log the high-level structure to help diagnose
    console.log("Alchemy webhook payload structure:", {
      webhookId: payload.webhookId,
      id: payload.id,
      type: payload.type,
      eventDataExists: !!payload.event?.data,
      blockExists: !!payload.event?.data?.block,
      logsCount: payload.event?.data?.block?.logs?.length || 0,
    });
  } catch (error) {
    console.error("Failed to parse webhook payload:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // --- Event Extraction ---
  // Adjust this path based on your actual GraphQL query structure
  const events = payload?.event?.data?.block?.logs ?? [];

  if (events.length === 0) {
    console.log("No relevant logs found in Alchemy webhook payload.");
    // Alchemy sends heartbeats even with no matching logs, return 200 OK
    return NextResponse.json({ message: "No events to process" });
  }

  console.log(
    `Extracted ${events.length} potential logs from Alchemy webhook.`
  );

  // --- Event Processing ---
  try {
    const result = await processAlchemyWebhookEvents(events);
    console.log("Alchemy event processing result:", result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing Alchemy events:", error);
    return NextResponse.json(
      { error: "Internal server error during event processing" },
      { status: 500 }
    );
  }
}

// Optional: Add a GET handler for health checks or simple verification
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Alchemy webhook handler for pool tracking is operational",
  });
}
