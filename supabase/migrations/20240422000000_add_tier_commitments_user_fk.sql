-- First, create a temporary table to store commitments that would violate the FK
CREATE TEMP TABLE invalid_commitments AS
SELECT DISTINCT tc.user_address
FROM public.tier_commitments tc
LEFT JOIN public.users u ON tc.user_address = u.smart_wallet_address
WHERE u.smart_wallet_address IS NULL;

-- Log the invalid commitments for review
\echo 'Found invalid commitments:'
SELECT * FROM invalid_commitments;

-- For now, we'll just add the foreign key without CASCADE
-- This will prevent new invalid commitments but won't affect existing ones
ALTER TABLE public.tier_commitments
ADD CONSTRAINT fk_tier_commitments_user
FOREIGN KEY (user_address)
REFERENCES public.users(smart_wallet_address);

-- Add an index to improve join performance
CREATE INDEX IF NOT EXISTS idx_tier_commitments_user_address_fk
ON public.tier_commitments(user_address);

-- Add comment to document the relationship
COMMENT ON CONSTRAINT fk_tier_commitments_user ON public.tier_commitments
IS 'Links tier commitments to users via their smart wallet address';

-- Clean up
DROP TABLE invalid_commitments; 