// contracts/streams/pool-stream-alchemy-query.js

// NOTE: Paste the GraphQL query below (inside the backticks) into the
// Alchemy Custom Webhook configuration GraphQL playground.

// You MUST verify the exact root subscription field (e.g., 'block' or 'alchemy_minedTransactions')
// and the exact field name for reorg detection (e.g., 'removed') in the Alchemy playground
// for your selected chain (Monad Testnet, if supported).

const alchemyGraphqlQuery = `
subscription {
  # Using 'block' based on examples, verify if this is correct for your needs
  # or if a transaction-based subscription like 'alchemy_minedTransactions' is better.
  block {
    # Include block fields if needed (e.g., hash, number, timestamp)
    # hash
    # number
    # timestamp

    # Filter logs within the block
    logs(
      filter: {
        # Filter by topic0 - matches any of the specified event signatures
        # This uses OR logic for the inner array.
        topics: [
          [
            "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e", // POOL_CREATED_TOPIC
            "0xd9861a9641141da7a608bb821575da486cc59cac5cf3f24e644633d8b9a051b5", // TIER_COMMITTED_TOPIC
            "0x83f00c5c08fb55fde46aa16f1732a744093b07a1ca3909114ec61b978d4e5458"  // POOL_STATUS_UPDATED_TOPIC
          ]
          # Add null placeholders or specific topics for topic1, topic2 etc. if needed
          # Example: topics: [ [TOPIC0_OPTIONS], null, [TOPIC2_OPTIONS] ]
        ]
        # Optional: Filter by specific contract addresses if applicable
        # addresses: ["0xYourFactoryAddressIfOnlyFactoryEmitsPoolCreated"]
      }
    ) {
      # --- Core Log Fields Needed for Processing ---
      address         # (string) Contract address emitting the log (pool address)
      topics          # (array of strings) Log topics
      data            # (string) Log data payload
      blockNumber     # (string/int - verify format) Block number where the log occurred
      blockHash       # (string) Hash of the block containing the log
      transactionHash # (string) Hash of the transaction containing the log
      logIndex        # (string/int - verify format) Index of the log within the block
      removed         # (boolean - CRITICAL) Indicates if log was removed due to reorg. Verify exact field name in Alchemy playground!

      # --- Optional but potentially useful fields ---
      # account { address } # Alternative way to get emitting contract address
      # transaction {       # Details about the containing transaction
      #   hash
      #   index
      #   from { address }
      #   to { address }
      #   value
      #   gasUsed
      #   status # 0x1 for success, 0x0 for failure
      # }
    }
  }
}
`;

// Exporting just in case it's ever needed, but primary use is copy-pasting.
module.exports = alchemyGraphqlQuery;
