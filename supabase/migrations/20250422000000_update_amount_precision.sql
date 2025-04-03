-- Update amount columns to store USDC base units (6 decimal places)
ALTER TABLE pools
ALTER COLUMN target_amount TYPE NUMERIC(38, 0), -- Allow for large numbers without decimals
ALTER COLUMN cap_amount TYPE NUMERIC(38, 0),
ALTER COLUMN raised_amount TYPE NUMERIC(38, 0);

-- Add comment to document the change
COMMENT ON COLUMN pools.target_amount IS 'Target amount in USDC base units (6 decimal places)';
COMMENT ON COLUMN pools.cap_amount IS 'Cap amount in USDC base units (6 decimal places), 0 means uncapped';
COMMENT ON COLUMN pools.raised_amount IS 'Raised amount in USDC base units (6 decimal places)';

-- Update patrons table amount column as well
ALTER TABLE patrons
ALTER COLUMN amount TYPE NUMERIC(38, 0);

COMMENT ON COLUMN patrons.amount IS 'Commitment amount in USDC base units (6 decimal places)'; 