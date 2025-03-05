-- Add contract_address column to the pools table
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS contract_address TEXT;

-- Add an index on the contract_address column for faster lookups
CREATE INDEX IF NOT EXISTS idx_pools_contract_address ON pools (contract_address);

-- Update the comment on the table to document the new column
COMMENT ON TABLE pools IS 'Pools table with blockchain integration. blockchain_status can be: pending, confirmed, failed. blockchain_network can be: monad, base, ethereum, etc. contract_address stores the deployed pool contract address.';
