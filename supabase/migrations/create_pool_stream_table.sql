-- supabase/migrations/create_pool_stream_table.sql

-- Create a parallel table to store pool data synced from blockchain events via QuickNode Streams
create table public.pool_stream (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(), -- Add an updated_at timestamp

  -- Core Pool Details (from PoolCreated event & getPoolDetails)
  name text not null,
  unique_id text not null, -- Match contract naming
  creator_address text not null, -- Store creator wallet address
  target_amount numeric not null,
  cap_amount numeric null,
  ends_at timestamp with time zone not null,
  lp_token_address text null,
  nft_contract_address text null, -- Store associated NFT contract
  contract_address text not null unique, -- Pool contract address is the unique identifier here

  -- Dynamic State (updated by subsequent events)
  status text not null default 'ACTIVE', -- Reflect PoolStatus enum more closely
  total_deposits numeric not null default 0,
  revenue_accumulated numeric not null default 0,
  target_reached_time timestamp with time zone null,
  cap_reached_time timestamp with time zone null,

  -- Metadata (potentially enriched later)
  description text null,
  currency text not null default 'USDC'::text, -- Assuming depositToken is USDC
  token_amount numeric null, -- Might be less relevant if using LP tokens?
  token_symbol text null,    -- LP token symbol?
  location text null,
  venue text null,
  image_url text null,
  social_links jsonb null default '{}'::jsonb,
  ticker text null, -- LP token ticker?

  -- Blockchain Sync Info
  last_processed_block_number bigint null, -- Track sync progress

  constraint pool_stream_pkey primary key (id),
  constraint pool_stream_contract_address_key unique (contract_address) -- Ensure unique pool contracts
);

-- Add comment explaining the purpose of the table
comment on table public.pool_stream is 'Stores pool data synchronized from Monad blockchain events via QuickNode Streams. Serves as a read cache.';

-- Indexes
create index IF not exists idx_pool_stream_creator_address on public.pool_stream using btree (creator_address) TABLESPACE pg_default;
create index IF not exists idx_pool_stream_lp_token_address on public.pool_stream using btree (lp_token_address) TABLESPACE pg_default;
create index IF not exists idx_pool_stream_nft_contract_address on public.pool_stream using btree (nft_contract_address) TABLESPACE pg_default;
create index IF not exists idx_pool_stream_status on public.pool_stream using btree (status) TABLESPACE pg_default;
create index IF not exists idx_pool_stream_ends_at on public.pool_stream using btree (ends_at) TABLESPACE pg_default;
create index IF not exists idx_pool_stream_unique_id on public.pool_stream using btree (unique_id) TABLESPACE pg_default; -- Index uniqueId if used for lookups

-- Optional: Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pool_stream_updated_at
BEFORE UPDATE ON public.pool_stream
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 