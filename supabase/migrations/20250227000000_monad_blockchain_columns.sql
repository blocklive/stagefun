-- Add Monad-specific blockchain columns to the pools table
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS blockchain_network TEXT,
ADD COLUMN IF NOT EXISTS blockchain_explorer_url TEXT;

-- Update the comment on the table to document the new columns
COMMENT ON TABLE pools IS 'Pools table with blockchain integration. blockchain_status can be: pending, confirmed, failed. blockchain_network can be: monad, base, ethereum, etc.'; 