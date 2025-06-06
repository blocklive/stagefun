-- Migration: Create AMM (Automated Market Maker) tables
-- Description: Creates tables to track AMM pairs, transactions, and snapshots

-- Table to track AMM pair creation and metadata
CREATE TABLE IF NOT EXISTS amm_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_address TEXT NOT NULL UNIQUE,
    token0_address TEXT NOT NULL,
    token1_address TEXT NOT NULL, 
    factory_address TEXT NOT NULL,
    created_at_block BIGINT NOT NULL,
    created_at_timestamp TIMESTAMPTZ NOT NULL,
    total_supply TEXT NOT NULL DEFAULT '0',
    reserve0 TEXT NOT NULL DEFAULT '0',
    reserve1 TEXT NOT NULL DEFAULT '0',
    last_sync_block BIGINT,
    last_sync_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for amm_pairs
CREATE INDEX IF NOT EXISTS idx_amm_pairs_pair_address ON amm_pairs(pair_address);
CREATE INDEX IF NOT EXISTS idx_amm_pairs_token0 ON amm_pairs(token0_address);
CREATE INDEX IF NOT EXISTS idx_amm_pairs_token1 ON amm_pairs(token1_address);
CREATE INDEX IF NOT EXISTS idx_amm_pairs_factory ON amm_pairs(factory_address);
CREATE INDEX IF NOT EXISTS idx_amm_pairs_created_block ON amm_pairs(created_at_block);

-- Table to track all AMM transactions (mints, burns, swaps)
CREATE TABLE IF NOT EXISTS amm_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    pair_address TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('mint', 'burn', 'swap')),
    user_address TEXT NOT NULL,
    amount0 TEXT NOT NULL DEFAULT '0',
    amount1 TEXT NOT NULL DEFAULT '0',
    amount0_out TEXT DEFAULT '0',
    amount1_out TEXT DEFAULT '0',
    liquidity_amount TEXT DEFAULT '0',
    log_index INTEGER NOT NULL,
    raw_event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for amm_transactions
CREATE INDEX IF NOT EXISTS idx_amm_transactions_hash ON amm_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_amm_transactions_pair ON amm_transactions(pair_address);
CREATE INDEX IF NOT EXISTS idx_amm_transactions_user ON amm_transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_amm_transactions_type ON amm_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_amm_transactions_block ON amm_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_amm_transactions_timestamp ON amm_transactions(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_amm_transactions_unique ON amm_transactions(transaction_hash, log_index);

-- Table for periodic snapshots of pair data (for charts/analytics)
CREATE TABLE IF NOT EXISTS amm_pair_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_address TEXT NOT NULL,
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    tvl_usd NUMERIC(20,8),
    price_token0 NUMERIC(36,18),
    price_token1 NUMERIC(36,18),
    volume_24h NUMERIC(20,8),
    fees_24h NUMERIC(20,8),
    apr NUMERIC(10,4),
    reserve0 TEXT NOT NULL,
    reserve1 TEXT NOT NULL,
    total_supply TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for amm_pair_snapshots
CREATE INDEX IF NOT EXISTS idx_amm_snapshots_pair ON amm_pair_snapshots(pair_address);
CREATE INDEX IF NOT EXISTS idx_amm_snapshots_timestamp ON amm_pair_snapshots(snapshot_timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_amm_snapshots_unique ON amm_pair_snapshots(pair_address, snapshot_timestamp); 