-- Create tables for our application

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE,
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  twitter_username TEXT
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  funding_stage TEXT NOT NULL DEFAULT 'raising',
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  target_amount NUMERIC NOT NULL,
  raised_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  token_amount NUMERIC,
  token_symbol TEXT,
  location TEXT,
  venue TEXT,
  image_url TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  min_commitment NUMERIC,
  ticker TEXT
);

-- Patrons table (for users who commit to pools)
CREATE TABLE IF NOT EXISTS patrons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, pool_id)
);

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
CREATE INDEX IF NOT EXISTS idx_pools_creator_id ON pools(creator_id);
CREATE INDEX IF NOT EXISTS idx_patrons_user_id ON patrons(user_id);
CREATE INDEX IF NOT EXISTS idx_patrons_pool_id ON patrons(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action_type ON point_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);

-- Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" 
  ON users FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Pools policies
CREATE POLICY "Anyone can view pools" 
  ON pools FOR SELECT 
  USING (true);

CREATE POLICY "Users can create pools" 
  ON pools FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their pools" 
  ON pools FOR UPDATE 
  USING (auth.uid() = creator_id);

-- Patrons policies
CREATE POLICY "Anyone can view patrons" 
  ON patrons FOR SELECT 
  USING (true);

CREATE POLICY "Users can become patrons" 
  ON patrons FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their patron status" 
  ON patrons FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS policy for user_points - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own points" ON user_points;
CREATE POLICY "Deny all operations" ON user_points FOR ALL USING (false);

-- RLS policy for point_transactions - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own point transactions" ON point_transactions;
CREATE POLICY "Deny all operations" ON point_transactions FOR ALL USING (false);

-- RLS policy for daily_checkins - deny all operations by default
DROP POLICY IF EXISTS "Users can view only their own daily checkins" ON daily_checkins;
CREATE POLICY "Deny all operations" ON daily_checkins FOR ALL USING (false);

-- No direct insert/update allowed - must go through service role API 