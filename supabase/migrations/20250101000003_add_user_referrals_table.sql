-- Create user_referrals table to track active referral sessions
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  referrer_twitter_username TEXT NOT NULL,
  pool_id TEXT NOT NULL, -- Track which pool they were referred to
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'), -- Referrals expire after 24 hours
  used BOOLEAN DEFAULT FALSE, -- Track if this referral has been used
  
  -- Ensure one active referral per user per pool per referrer
  UNIQUE(user_id, pool_id, referrer_twitter_username)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_referrals_user_id ON public.user_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_pool_id ON public.user_referrals(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_expires_at ON public.user_referrals(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_referrals_lookup ON public.user_referrals(user_id, pool_id, expires_at, used); 