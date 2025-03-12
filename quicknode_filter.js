function main(payload) {
  const { data, metadata } = payload;

  // Define event signatures for StageDotFunPool events
  const poolEventSignatures = [
    "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c", // Deposit
    "0x4e3883c75cc9c752bb1db2e9a57cc7198fbf0d27b4b5bc49756899d5d30fcd28", // RevenueReceived
    "0x63450f93c75a5f8e1c2116e1617861f6ea539956e9a7d7d8bd31a148aa3eaa4a", // RevenueDistributed
    // Add other pool event signatures here as needed
  ];

  // Define the PoolCreated event signature from the factory
  const poolCreatedSignature =
    "0x3c23c01a1d7f1b8e9f3a6efba285562b3326b2d8c0b1a2861da85c4524df0b3e";

  // Filter logs by event signature
  const relevantEvents = [];

  // Process each log in the stream
  if (data && Array.isArray(data) && data.length > 0) {
    data.forEach((log) => {
      if (log.topics && log.topics.length > 0) {
        const eventSignature = log.topics[0];

        // Check if this is a pool operation event or pool creation event
        if (
          poolEventSignatures.includes(eventSignature) ||
          eventSignature === poolCreatedSignature
        ) {
          relevantEvents.push({
            type:
              eventSignature === poolCreatedSignature
                ? "pool_created"
                : "pool_event",
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            contractAddress: log.address,
            eventSignature: eventSignature,
            data: log.data,
            topics: log.topics,
          });
        }
      }
    });
  }

  // Only return data if we found relevant events
  if (relevantEvents.length > 0) {
    return {
      events: relevantEvents,
      metadata: metadata,
    };
  }

  // Return null if no relevant events were found
  return null;
}
