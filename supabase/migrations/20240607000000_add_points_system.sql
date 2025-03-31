-- User Points table
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Point Transactions table to track history of point operations
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  action_type TEXT NOT NULL, -- 'daily_checkin', 'social_follow', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- Additional data like streak count
);

-- Daily Check-in table to track streaks and last claim time
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_count INT NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action_type ON point_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Complete lockdown - all access must go through service role API
-- No direct access from client-side (anon or authenticated)

-- RLS policy for user_points - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own points" ON user_points;
CREATE POLICY "Deny all operations" ON user_points FOR ALL USING (false);

-- RLS policy for point_transactions - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own point transactions" ON point_transactions;
CREATE POLICY "Deny all operations" ON point_transactions FOR ALL USING (false);

-- RLS policy for daily_checkins - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own daily checkins" ON daily_checkins;
CREATE POLICY "Deny all operations" ON daily_checkins FOR ALL USING (false); 