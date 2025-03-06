-- Add lp_token_address column to pools table
ALTER TABLE public.pools
ADD COLUMN IF NOT EXISTS lp_token_address text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pools_lp_token_address ON public.pools USING btree (lp_token_address) TABLESPACE pg_default; 