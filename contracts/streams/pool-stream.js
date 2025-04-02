function stripPadding(logTopic) {
  return logTopic ? "0x" + logTopic.slice(-40).toLowerCase() : "";
}

function parseSingleData(data) {
  if (!data || data === "0x") return { tokenId: 0, value: 0 };
  const idHex = data.slice(2, 66).replace(/^0+/, "") || "0";
  const valueHex = data.slice(66).replace(/^0+/, "") || "0";
  const id = idHex === "0" ? 0 : BigInt("0x" + idHex);
  const value = valueHex === "0" ? 0 : BigInt("0x" + valueHex);
  return { tokenId: id, value: value };
}

function parseBatchData(data) {
  if (!data || data.length < 130) return { ids: [], values: [] };
  const idsArrayOffset = parseInt(data.slice(2, 66), 16) * 2 + 2;
  const valuesArrayOffset = parseInt(data.slice(66, 130), 16) * 2 + 2;
  const tokenCount = (valuesArrayOffset - idsArrayOffset) / 64;

  const ids = Array.from({ length: tokenCount }, (_, i) => {
    const idHex =
      data
        .slice(idsArrayOffset + i * 64, idsArrayOffset + (i + 1) * 64)
        .replace(/^0+/, "") || "0";
    return idHex === "0" ? 0 : BigInt("0x" + idHex);
  });

  const values = Array.from({ length: tokenCount }, (_, i) => {
    const valueHex =
      data
        .slice(valuesArrayOffset + i * 64, valuesArrayOffset + (i + 1) * 64)
        .replace(/^0+/, "") || "0";
    return valueHex === "0" ? 0 : BigInt("0x" + valueHex);
  });

  return { ids, values };
}

// --- Keep helper functions if provided ---

// Replace with your actual factory addresses (lowercase)
// const FACTORY_ADDRESSES = [
//   "0x24ec1a5bad13cb96562d6d37de3f753e3c1ac099", // Ensure lowercase
// Add more factory addresses if needed (lowercase)
// ];

// Topic hashes for events we want to track
const POOL_CREATED_TOPIC =
  "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e";

// TierCommitted event topic hash - CORRECTED from actual transaction logs
const TIER_COMMITTED_TOPIC =
  "0xd9861a9641141da7a608bb821575da486cc59cac5cf3f24e644633d8b9a051b5";

// The main function processes the stream data
function main(stream) {
  const allMatchingLogs = [];

  // Check if the basic structure is as expected
  if (!stream || !Array.isArray(stream.data)) {
    return null; // Return null to avoid webhook call
  }

  // Iterate through the outer array (blocks?)
  for (const blockData of stream.data) {
    // Check if blockData is an array (transactions?)
    if (!Array.isArray(blockData)) continue;

    // Iterate through the middle array (transactions?)
    for (const txData of blockData) {
      // Check if txData is an array (logs?)
      if (!Array.isArray(txData)) continue;

      // Iterate through the inner array (the logs)
      for (const log of txData) {
        // Basic validation of the log object structure
        if (
          !log ||
          !log.address ||
          !Array.isArray(log.topics) ||
          log.topics.length === 0
        ) {
          continue; // Skip malformed logs
        }

        // Normalize topics for comparison
        const eventTopic = log.topics[0].toLowerCase();

        // --- Filtering Logic ---

        // Case 1: PoolCreated events from any contract (factory)
        if (eventTopic === POOL_CREATED_TOPIC) {
          console.log("Found PoolCreated event");
          allMatchingLogs.push(log);
          continue;
        }

        // Case 2: TierCommitted events from any contract (pool)
        if (eventTopic === TIER_COMMITTED_TOPIC) {
          console.log("Found TierCommitted event");
          allMatchingLogs.push(log);
          continue;
        }
      }
    }
  }

  // CRITICAL: Return null instead of empty array when no matches
  // This prevents the webhook from being called when there are no relevant events
  if (allMatchingLogs.length === 0) {
    return null;
  }

  // Return the flattened array of all matching logs found across all blocks/transactions
  return allMatchingLogs;
}
