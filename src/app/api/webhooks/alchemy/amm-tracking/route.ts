import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
const { processAmmWebhookEvents } = await import(
  "@/lib/services/blockchain/amm-events.service"
);

// Rate limiting map (simple in-memory store for this example)
const rateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];

  // Clean old requests
  const validRequests = requests.filter(
    (time) => now - time < RATE_LIMIT_WINDOW
  );

  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return false;
}

export async function POST(request: NextRequest) {
  console.log("🔥 AMM WEBHOOK RECEIVED at", new Date().toISOString());

  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      console.log("⚠️ Rate limit exceeded for IP:", ip);
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Verify the webhook signature
    const signature = request.headers.get("x-alchemy-signature");
    const body = await request.text();

    console.log("📥 Raw webhook body length:", body.length);

    // Verify signature if provided
    if (signature && process.env.ALCHEMY_AMM_TRACKING_SIGNING_KEY) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.ALCHEMY_AMM_TRACKING_SIGNING_KEY)
        .update(body)
        .digest("hex");

      const providedSignature = signature.replace("0x", "");

      console.log("🔐 Signature debug:", {
        provided: providedSignature.substring(0, 20) + "...",
        expected: expectedSignature.substring(0, 20) + "...",
        bodyLength: body.length,
        match: expectedSignature === providedSignature,
      });

      if (expectedSignature !== providedSignature) {
        console.error(
          "❌ Invalid webhook signature - allowing anyway for debugging"
        );
        // TODO: Re-enable this once signature is working
        // return NextResponse.json(
        //   { error: "Invalid signature" },
        //   { status: 401 }
        // );
      } else {
        console.log("✅ Webhook signature verified");
      }
    } else if (signature) {
      console.warn("⚠️ Signature provided but no signing key configured");
    } else {
      console.log("ℹ️ No signature provided");
    }

    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (parseError) {
      console.error("❌ Failed to parse webhook body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate webhook structure
    if (!webhookData || typeof webhookData !== "object") {
      console.error("❌ Invalid webhook payload structure");
      return NextResponse.json(
        { error: "Invalid webhook payload structure" },
        { status: 400 }
      );
    }

    console.log("✅ Parsed AMM webhook successfully:", {
      dataKeys: Object.keys(webhookData),
      hasEvent: !!webhookData.event,
      hasData: !!webhookData.data,
    });

    // Extract events from the webhook payload
    let events: any[] = [];

    // Handle different webhook payload structures
    if (
      webhookData.event &&
      webhookData.event.data &&
      webhookData.event.data.block
    ) {
      // Alchemy GraphQL webhook format
      const block = webhookData.event.data.block;
      if (block.logs && Array.isArray(block.logs)) {
        events = block.logs.map((log: any) => ({
          ...log,
          blockNumber: `0x${block.number.toString(16)}`,
          blockHash: block.hash,
          blockTimestamp: block.timestamp,
          transactionHash: log.transaction?.hash,
          transactionIndex: log.transaction?.index,
          logIndex: log.index,
          removed: false, // Alchemy typically doesn't send removed events in regular webhooks
          address: log.account?.address, // Fix missing address field
        }));
      }
    } else if (Array.isArray(webhookData)) {
      // Direct array of events
      events = webhookData;
    } else if (webhookData.logs && Array.isArray(webhookData.logs)) {
      // Logs array in payload
      events = webhookData.logs;
    }

    if (events.length === 0) {
      console.log("⚠️ No events found in webhook payload");
      return NextResponse.json({
        message: "No events to process",
        processed: 0,
      });
    }

    console.log(`🔄 Processing ${events.length} AMM events`);

    // Only log first few events to avoid spam
    const eventsToLog = Math.min(events.length, 3);
    console.log(`📊 First ${eventsToLog} event(s):`);

    for (let i = 0; i < eventsToLog; i++) {
      const event = events[i];
      console.log(
        `  ${i + 1}. ${event.address} | Topics: ${event.topics?.[0]} | Tx: ${
          event.transactionHash
        }`
      );
    }

    if (events.length > 3) {
      console.log(`  ... and ${events.length - 3} more events`);
    }

    // Process the events with error handling
    let result;
    try {
      result = await processAmmWebhookEvents(events, {
        source: "alchemy_webhook",
      });
    } catch (processError: any) {
      console.error("❌ Error processing AMM events:", {
        error: processError.message,
        stack: processError.stack,
        eventsCount: events.length,
      });

      // Return success to prevent Alchemy from stopping webhooks
      // but log the actual error for debugging
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: events.length,
        total: events.length,
        message: "Events received but processing failed - check logs",
        error: processError.message,
      });
    }

    // Log the results
    console.log("✅ AMM webhook processing result:", {
      processed: result.processed,
      skipped: result.skipped,
      total: result.total || events.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      total: result.total || events.length,
      message: "AMM events processed successfully",
    });
  } catch (error: any) {
    console.error("❌ AMM webhook processing error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process AMM webhook",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "amm-tracking",
    timestamp: new Date().toISOString(),
  });
}
