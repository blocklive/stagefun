-- Add MON transaction fields to faucet_requests table
ALTER TABLE faucet_requests
ADD COLUMN mon_tx_hash TEXT,
ADD COLUMN mon_amount TEXT;
