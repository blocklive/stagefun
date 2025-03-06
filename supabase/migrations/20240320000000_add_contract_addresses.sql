-- Add contract_address and lp_token_address columns to pools table
ALTER TABLE pools
ADD COLUMN contract_address text,
ADD COLUMN lp_token_address text;

-- Add indexes for faster lookups
CREATE INDEX idx_pools_contract_address ON pools(contract_address);
CREATE INDEX idx_pools_lp_token_address ON pools(lp_token_address);

-- Add unique constraint to ensure no duplicate contract addresses
ALTER TABLE pools
ADD CONSTRAINT unique_contract_address UNIQUE (contract_address); 