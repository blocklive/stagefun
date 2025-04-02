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
const FACTORY_ADDRESSES = [
  "0x24ec1a5bad13cb96562d6d37de3f753e3c1ac099", // Ensure lowercase
  // Add more factory addresses if needed (lowercase)
];

// CORRECT PoolCreated Topic Hash observed from logs
const POOL_CREATED_TOPIC =
  "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e";

// The main function processes the stream data
function main(stream) {
  const allMatchingLogs = [];

  // Check if the basic structure is as expected
  if (!stream || !Array.isArray(stream.data)) {
    return []; // Return empty if structure is wrong
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

        // Normalize addresses and topics for comparison
        const logAddress = log.address.toLowerCase();
        const eventTopic = log.topics[0].toLowerCase();

        // --- Filtering Logic ---
        const isFromFactory = FACTORY_ADDRESSES.includes(logAddress);
        const isPoolCreatedEvent = eventTopic === POOL_CREATED_TOPIC;

        // If it matches, add it to our results
        if (isFromFactory && isPoolCreatedEvent) {
          allMatchingLogs.push(log);
        }
      }
    }
  }

  // CRITICAL CHANGE: Return null instead of empty array when no matches
  if (allMatchingLogs.length === 0) {
    return null; // Should prevent the webhook from being called
  }

  // Return the flattened array of all matching logs found across all blocks/transactions
  return allMatchingLogs;
}
