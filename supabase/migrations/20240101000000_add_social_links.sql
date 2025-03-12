-- Add social_links JSONB column to the pools table
ALTER TABLE public.pools 
ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb;

-- Add an index for efficient querying on the JSONB field
CREATE INDEX idx_pools_social_links ON public.pools USING GIN (social_links);

-- Add comment to document the column
COMMENT ON COLUMN public.pools.social_links IS 'Social media links for the pool. Format: {"website": "url", "twitter": "url", "discord": "url", "instagram": "url"}'; 