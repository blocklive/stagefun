-- Update Investment Terms: Add profit share and yield distribution frequency
-- Remove yield calculation method, update return type constraint

BEGIN;

-- Add new columns
ALTER TABLE public.pool_investment_terms 
  ADD COLUMN IF NOT EXISTS profit_share_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS profit_share_distribution_frequency TEXT,
  ADD COLUMN IF NOT EXISTS yield_distribution_frequency TEXT;

-- Update the return_type constraint to include profit_share
ALTER TABLE public.pool_investment_terms 
  DROP CONSTRAINT IF EXISTS pool_investment_terms_return_type_check;

ALTER TABLE public.pool_investment_terms 
  ADD CONSTRAINT pool_investment_terms_return_type_check 
  CHECK (return_type = ANY (ARRAY['fixed_yield'::text, 'revenue_share'::text, 'profit_share'::text, 'appreciation'::text, 'hybrid'::text]));

-- Remove yield calculation method column and its constraint
ALTER TABLE public.pool_investment_terms 
  DROP CONSTRAINT IF EXISTS pool_investment_terms_yield_calculation_method_check;

ALTER TABLE public.pool_investment_terms 
  DROP COLUMN IF EXISTS yield_calculation_method;

COMMIT; 