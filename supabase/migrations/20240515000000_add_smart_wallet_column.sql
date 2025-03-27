-- Add smart_wallet_address column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS smart_wallet_address TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_smart_wallet_address ON users(smart_wallet_address);

-- Add comment to document the purpose of this column
COMMENT ON COLUMN users.smart_wallet_address IS 'The address of the user''s smart wallet (if they have one)'; 