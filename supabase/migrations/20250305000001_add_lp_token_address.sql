-- Add LP token address column to pools table
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS lp_token_address TEXT;

-- Add index for LP token address
CREATE INDEX IF NOT EXISTS idx_pools_lp_token ON pools (lp_token_address); 