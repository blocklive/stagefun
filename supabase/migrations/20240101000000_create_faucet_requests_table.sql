-- Create a table for tracking faucet requests
CREATE TABLE IF NOT EXISTS faucet_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  tx_hash TEXT,
  amount TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add indexes for faster queries
  CONSTRAINT faucet_requests_wallet_address_idx UNIQUE (wallet_address, created_at)
);

-- Add RLS policies
ALTER TABLE faucet_requests ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated users and server-side
CREATE POLICY "Allow inserts from server" ON faucet_requests
  FOR INSERT WITH CHECK (true);

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON faucet_requests
  FOR SELECT USING (true); 