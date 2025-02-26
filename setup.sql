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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pools_creator_id ON pools(creator_id);
CREATE INDEX IF NOT EXISTS idx_patrons_user_id ON patrons(user_id);
CREATE INDEX IF NOT EXISTS idx_patrons_pool_id ON patrons(pool_id);

-- Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

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

-- Function to update a pool's raised amount based on patron commitments
CREATE OR REPLACE FUNCTION update_pool_raised_amount(p_pool_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE pools
  SET raised_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM patrons
    WHERE pool_id = p_pool_id
  )
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql; 