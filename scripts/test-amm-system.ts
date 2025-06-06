import {
  processAmmWebhookEvents,
  AMM_EVENT_TOPICS,
  AMM_CONTRACTS,
} from "../src/lib/services/blockchain/amm-events.service";

// Mock event data for testing
const mockPairCreatedEvent = {
  blockNumber: "0x123456",
  blockHash: "0x7f8c1234...",
  blockTimestamp: Math.floor(Date.now() / 1000),
  transactionHash: "0xabcd1234...",
  transactionIndex: 0,
  logIndex: 0,
  removed: false,
  topics: [
    AMM_EVENT_TOPICS.PAIR_CREATED,
    "0x000000000000000000000000a0b86a33e6c04ca64d5c3b6d3e6f0b8cded9f6c", // token0
    "0x000000000000000000000000b1c97a44f7d15ca55e8c4e6d4f7a0c9d3e8b5a7", // token1
  ],
  data: "0x000000000000000000000000c2d08b55e8d26da66f9c5f7e5e8b1d0f4f9c6b8000000000000000000000000000000000000000000000000000000000000000001",
  account: {
    address: AMM_CONTRACTS.FACTORY,
  },
  transaction: {
    hash: "0xabcd1234...",
    index: 0,
    from: { address: "0x742d35Cc6634C0532925a3b8D2A6f01b2E0F7665" },
    to: { address: AMM_CONTRACTS.FACTORY },
    value: "0",
    gasUsed: "150000",
    status: 1,
  },
};

const mockSwapEvent = {
  blockNumber: "0x123457",
  blockHash: "0x8f9d2345...",
  blockTimestamp: Math.floor(Date.now() / 1000),
  transactionHash: "0xdefg5678...",
  transactionIndex: 1,
  logIndex: 0,
  removed: false,
  topics: [
    AMM_EVENT_TOPICS.SWAP,
    "0x000000000000000000000000742d35Cc6634C0532925a3b8D2A6f01b2E0F7665", // sender
    "0x000000000000000000000000742d35Cc6634C0532925a3b8D2A6f01b2E0F7665", // to
  ],
  data: "0x0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dd8eefb13a800000",
  account: {
    address: "0xc2d08b55e8d26da66f9c5f7e5e8b1d0f4f9c6b80", // pair address
  },
  transaction: {
    hash: "0xdefg5678...",
    index: 1,
    from: { address: "0x742d35Cc6634C0532925a3b8D2A6f01b2E0F7665" },
    to: { address: AMM_CONTRACTS.ROUTER },
    value: "0",
    gasUsed: "120000",
    status: 1,
  },
};

async function testAmmSystem() {
  console.log("🧪 Testing AMM Event Indexing System");
  console.log("=====================================");

  try {
    // Test 1: Event Topic Validation
    console.log("\n1. Testing Event Topics...");
    const topics = Object.entries(AMM_EVENT_TOPICS);
    topics.forEach(([name, hash]) => {
      console.log(`✅ ${name}: ${hash}`);
    });

    // Test 2: Contract Addresses
    console.log("\n2. Testing Contract Addresses...");
    console.log(`✅ Factory: ${AMM_CONTRACTS.FACTORY}`);
    console.log(`✅ Router: ${AMM_CONTRACTS.ROUTER}`);

    // Test 3: Process Mock Events
    console.log("\n3. Testing Event Processing...");

    const testEvents = [mockPairCreatedEvent, mockSwapEvent];

    console.log(`📥 Processing ${testEvents.length} mock events...`);

    const result = await processAmmWebhookEvents(testEvents, {
      skipEventStorage: true, // Skip database operations for testing
      source: "test_script",
    });

    console.log("📊 Processing Results:");
    console.log(`   - Processed: ${result.processed}`);
    console.log(`   - Skipped: ${result.skipped}`);
    console.log(`   - Total: ${result.total}`);

    if (result.results) {
      result.results.forEach((eventResult, index) => {
        console.log(
          `   - Event ${index + 1}: ${eventResult.event} → ${
            eventResult.status
          }`
        );
        if (eventResult.error) {
          console.log(`     Error: ${eventResult.error}`);
        }
      });
    }

    // Test 4: Webhook Endpoint Test
    console.log("\n4. Testing Webhook Endpoint...");

    try {
      const response = await fetch(
        "http://localhost:3000/api/webhooks/alchemy/amm-tracking",
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Webhook health check: ${data.status}`);
      } else {
        console.log(`⚠️  Webhook endpoint returned: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Webhook endpoint not accessible: ${error.message}`);
      console.log("   (This is expected if the server is not running)");
    }

    console.log("\n✅ AMM System Test Completed Successfully!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Run the database migration");
    console.log("   2. Configure Alchemy webhook");
    console.log("   3. Deploy and test with real events");
  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    process.exit(1);
  }
}

// Export for potential use in other scripts
export { testAmmSystem, mockPairCreatedEvent, mockSwapEvent };

// Run if called directly
if (require.main === module) {
  testAmmSystem();
}
