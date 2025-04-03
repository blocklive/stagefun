-- Add indexes to speed up queries on tier_commitments
CREATE INDEX IF NOT EXISTS idx_tier_commitments_pool_address 
ON tier_commitments(pool_address);

CREATE INDEX IF NOT EXISTS idx_tier_commitments_user_pool 
ON tier_commitments(user_address, pool_address);

-- Add comment for documentation
COMMENT ON TABLE tier_commitments IS 'Stores tier commitments from users to pools with direct aggregation in application code'; 