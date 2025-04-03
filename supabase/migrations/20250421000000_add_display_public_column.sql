-- Add display_public column to pools table
ALTER TABLE pools ADD COLUMN IF NOT EXISTS display_public BOOLEAN DEFAULT TRUE;

-- Add index for faster filtering on this column
CREATE INDEX IF NOT EXISTS idx_pools_display_public ON pools(display_public);

-- Add comment for documentation
COMMENT ON COLUMN pools.display_public IS 'Controls whether the pool appears in public listings, defaults to true'; 