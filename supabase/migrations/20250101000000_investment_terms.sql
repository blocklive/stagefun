-- Investment Terms System Migration
-- Creates tables for handling investment returns, yield, and regulatory compliance

-- Main investment terms table
CREATE TABLE IF NOT EXISTS public.pool_investment_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Return Structure
  return_type TEXT NOT NULL CHECK (return_type IN ('fixed_yield', 'revenue_share', 'appreciation', 'hybrid')),
  
  -- Yield Information
  expected_annual_yield NUMERIC(5,2), -- e.g., 15.50 for 15.5%
  yield_calculation_method TEXT CHECK (yield_calculation_method IN ('simple', 'compound', 'variable')),
  
  -- Revenue Share Details
  revenue_share_percentage NUMERIC(5,2), -- e.g., 25.00 for 25%
  revenue_distribution_frequency TEXT CHECK (revenue_distribution_frequency IN ('monthly', 'quarterly', 'annually', 'event_based')),
  
  -- Asset Appreciation
  projected_appreciation_percentage NUMERIC(5,2),
  appreciation_timeframe_months INTEGER,
  
  -- Risk & Terms
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  investment_horizon_months INTEGER NOT NULL,
  minimum_hold_period_months INTEGER,
  
  -- Regulatory Compliance
  regulatory_framework TEXT CHECK (regulatory_framework IN ('reg_cf', 'reg_d_506b', 'reg_d_506c', 'reg_a', 'other')),
  security_type TEXT CHECK (security_type IN ('equity', 'preferred', 'convertible_note', 'safe', 'debt', 'revenue_participation', 'token', 'security_token')),
  accredited_only BOOLEAN DEFAULT FALSE,
  
  -- Fees
  management_fee_percentage NUMERIC(5,2), -- e.g., 2.00 for 2%
  performance_fee_percentage NUMERIC(5,2), -- e.g., 20.00 for 20%
  
  -- Historical Performance (simplified)
  track_record TEXT CHECK (track_record IN ('first_time', 'some_experience', 'proven_track_record')),
  similar_projects_count INTEGER,
  average_returns_description TEXT, -- Simple text like "10-15% annually"
  notable_successes TEXT,
  benchmark_comparison TEXT CHECK (benchmark_comparison IN ('market', 'industry', 'custom', 'none')),
  
  -- Legal & Disclaimers
  terms_and_conditions TEXT,
  risk_disclosure TEXT,
  regulatory_notes TEXT,
  
  -- Template tracking
  template_used TEXT, -- Track which template was initially used
  
  CONSTRAINT unique_pool_investment_terms UNIQUE (pool_id)
);

-- Add investment enhancement columns to existing tiers table
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS yield_bonus_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS fee_discount_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS early_access BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS liquidity_preference_rank INTEGER;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS voting_rights BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS enhanced_rewards BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS custom_benefits TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pool_investment_terms_pool_id ON pool_investment_terms(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_investment_terms_return_type ON pool_investment_terms(return_type);
CREATE INDEX IF NOT EXISTS idx_pool_investment_terms_regulatory_framework ON pool_investment_terms(regulatory_framework);
CREATE INDEX IF NOT EXISTS idx_pool_investment_terms_risk_level ON pool_investment_terms(risk_level);

-- Add indexes for new tier columns
CREATE INDEX IF NOT EXISTS idx_tiers_yield_bonus ON tiers(yield_bonus_percentage) WHERE yield_bonus_percentage > 0;
CREATE INDEX IF NOT EXISTS idx_tiers_early_access ON tiers(early_access) WHERE early_access = true;
CREATE INDEX IF NOT EXISTS idx_tiers_voting_rights ON tiers(voting_rights) WHERE voting_rights = true;

-- Add comments for documentation
COMMENT ON TABLE pool_investment_terms IS 'Investment terms and yield information for pools including regulatory compliance';

COMMENT ON COLUMN pool_investment_terms.return_type IS 'Type of investment return: fixed_yield, revenue_share, appreciation, or hybrid';
COMMENT ON COLUMN pool_investment_terms.regulatory_framework IS 'SEC regulatory framework: reg_cf, reg_d_506b, reg_d_506c, reg_a';
COMMENT ON COLUMN pool_investment_terms.security_type IS 'Type of security being offered';
COMMENT ON COLUMN pool_investment_terms.track_record IS 'Creator track record level for historical performance';

-- Add comments for new tier columns
COMMENT ON COLUMN tiers.yield_bonus_percentage IS 'Additional yield percentage for this tier (added to base yield)';
COMMENT ON COLUMN tiers.fee_discount_percentage IS 'Management fee discount percentage for this tier';
COMMENT ON COLUMN tiers.early_access IS 'Whether this tier gets early access to distributions';
COMMENT ON COLUMN tiers.liquidity_preference_rank IS 'Exit priority rank (1 = highest priority)';
COMMENT ON COLUMN tiers.voting_rights IS 'Whether this tier gets voting rights';
COMMENT ON COLUMN tiers.enhanced_rewards IS 'Whether this tier gets enhanced rewards';
COMMENT ON COLUMN tiers.custom_benefits IS 'Custom benefits description for this tier';
