-- Add blockchain-related columns to the pools table
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS blockchain_block_number BIGINT,
ADD COLUMN IF NOT EXISTS blockchain_status TEXT;

-- Add an index on the blockchain_tx_hash column for faster lookups
CREATE INDEX IF NOT EXISTS idx_pools_blockchain_tx_hash ON pools (blockchain_tx_hash);

-- Add a comment to the table to document the new columns
COMMENT ON TABLE pools IS 'Pools table with blockchain integration. blockchain_status can be: pending, confirmed, failed'; 