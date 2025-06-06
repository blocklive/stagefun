# AMM Event Indexing System Setup

This document outlines the setup and usage of the new AMM (Automated Market Maker) event indexing system for tracking StageSwap AMM transactions.

## Overview

The AMM indexing system is designed to track:

- **PairCreated** events from the StageSwapFactory
- **Mint**, **Burn**, **Swap**, and **Sync** events from StageSwapPair contracts
- Automated snapshots every 5 minutes for analytics
- Complete transaction history for all AMM activities

## Database Setup

### 1. Run Migration

Execute the SQL migration to create the required tables:

```sql
-- Run the migration script
\i database/migrations/create_amm_tables.sql
```

This creates the following tables:

- `amm_pairs` - Track pair creation and metadata
- `amm_transactions` - Track all transactions (mints, burns, swaps)
- `amm_pair_snapshots` - Periodic snapshots for charts
- `blockchain_events_amm` - Raw event tracking for idempotency

### 2. Verify Tables

```sql
-- Check tables were created
\dt amm_*
\dt blockchain_events_amm
```

## Alchemy Webhook Setup

### 1. Configure Alchemy Stream

Create a new GraphQL webhook in Alchemy using the query from:

```
contracts/streams/amm-stream-alchemy-query.js
```

### 2. Webhook Endpoint

Point the Alchemy webhook to:

```
https://your-domain.com/api/webhooks/alchemy/amm-tracking
```

### 3. Test Webhook

```bash
# Test the webhook endpoint
curl -X GET https://your-domain.com/api/webhooks/alchemy/amm-tracking
# Should return: {"status":"healthy","endpoint":"amm-tracking","timestamp":"..."}
```

## Contract Addresses (Monad Testnet)

```typescript
StageSwapFactory: "0xB6162CcC7E84C18D605c6DFb4c337227C6dC5dF7"
StageSwapRouter: "0x4B883edfd434d74eBE82FE6dB5f058e6fF08cD53"
Network: Monad Testnet (Chain ID: 10143)
```

## Event Signatures Tracked

```
PairCreated(address,address,address,uint256)
→ 0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9

Mint(address,uint256,uint256)
→ 0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f

Burn(address,uint256,uint256,address)
→ 0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496

Swap(address,uint256,uint256,uint256,uint256,address)
→ 0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822

Sync(uint112,uint112)
→ 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
```

## Testing the System

### 1. Check Webhook Processing

Monitor the logs for incoming webhooks:

```bash
# View webhook processing logs
tail -f logs/application.log | grep "AMM webhook"
```

### 2. Query Database

```sql
-- Check raw events
SELECT count(*) FROM blockchain_events_amm;

-- Check processed pairs
SELECT pair_address, token0_address, token1_address, created_at_block
FROM amm_pairs
ORDER BY created_at_block DESC;

-- Check recent transactions
SELECT transaction_hash, event_type, pair_address, user_address, timestamp
FROM amm_transactions
ORDER BY timestamp DESC
LIMIT 10;

-- Check processing status
SELECT status, count(*)
FROM blockchain_events_amm
GROUP BY status;
```

### 3. Manual Event Processing

If you need to reprocess events or backfill data:

```typescript
import { processAmmWebhookEvents } from "@/lib/services/blockchain/amm-events.service";

// Process events with custom options
const result = await processAmmWebhookEvents(events, {
  skipEventStorage: false, // Set to true to skip duplicate checking
  source: "manual_backfill",
});
```

## Monitoring & Maintenance

### Health Checks

1. **Webhook Health**: Check the GET endpoint returns healthy status
2. **Event Processing**: Monitor `blockchain_events_amm` for failed events
3. **Data Consistency**: Verify transaction counts match blockchain activity

### Error Handling

- Failed events are marked with `status: 'failed'` in `blockchain_events_amm`
- Error messages are stored in the `error_message` field
- The system is idempotent - reprocessing events won't create duplicates

### Snapshots

- Snapshots are taken every 5 minutes automatically
- To manually trigger snapshots, implement the snapshot service
- Snapshots calculate TVL, prices, volume, and fees for analytics

## Future Enhancements

1. **Price Calculation Service**: Implement USD pricing using pair reserves
2. **APR Calculations**: Add automated APR calculations based on fees
3. **Volume Tracking**: Add 24h volume calculations
4. **Backfill Service**: Add service to backfill historical data
5. **Analytics API**: Create endpoints for charts and analytics

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**

   - Check Alchemy webhook configuration
   - Verify contract addresses in the GraphQL query
   - Ensure webhook URL is accessible

2. **Events Not Processing**

   - Check database connection
   - Verify table schema matches migration
   - Check for linter/TypeScript errors

3. **Duplicate Events**

   - System should automatically handle duplicates
   - Check `blockchain_events_amm` for duplicate `event_hash` values

4. **Missing Events**
   - Events may arrive out of order
   - Use block number to verify completeness
   - Implement backfill for gaps

### Debug Commands

```bash
# Check recent webhook calls
grep "AMM webhook" logs/*.log | tail -20

# Check database connectivity
psql -d your_database -c "SELECT count(*) FROM blockchain_events_amm;"

# Validate event signatures
node -e "console.log(require('crypto').createHash('sha256').update('PairCreated(address,address,address,uint256)').digest('hex'))"
```

## Support

For issues or questions about the AMM indexing system:

1. Check the logs for error messages
2. Verify database schema and connections
3. Test webhook endpoint manually
4. Review Alchemy webhook configuration

The system is designed to be resilient and self-healing, automatically handling most edge cases and network issues.
