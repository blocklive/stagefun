-- Add featured column to pools table
ALTER TABLE pools ADD COLUMN IF NOT EXISTS featured INTEGER DEFAULT NULL;
-- Create an index for better performance when querying featured pools
CREATE INDEX IF NOT EXISTS idx_pools_featured ON pools(featured); 