-- Add referral_points column to user_points table
ALTER TABLE public.user_points
ADD COLUMN IF NOT EXISTS referral_points BIGINT NOT NULL DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN public.user_points.referral_points IS 'Points earned from referring users who fund pools'; 