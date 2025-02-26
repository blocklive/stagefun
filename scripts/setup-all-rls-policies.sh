#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo "Error: .env.local file not found"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase environment variables"
  exit 1
fi

# SQL to execute via the SQL Editor in Supabase Dashboard
echo "Execute the following SQL in the Supabase SQL Editor:"
cat << 'EOF'
-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Allow public creation of users" ON users;

DROP POLICY IF EXISTS "Anyone can view pools" ON pools;
DROP POLICY IF EXISTS "Users can create pools" ON pools;
DROP POLICY IF EXISTS "Creators can update their pools" ON pools;

DROP POLICY IF EXISTS "Anyone can view patrons" ON patrons;
DROP POLICY IF EXISTS "Users can become patrons" ON patrons;
DROP POLICY IF EXISTS "Users can update their patron status" ON patrons;

-- Users table policies
CREATE POLICY "Users can view all users" 
  ON users FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  TO public
  USING (true);

CREATE POLICY "Allow public creation of users" 
  ON users FOR INSERT 
  TO public
  WITH CHECK (true);

-- Pools policies
CREATE POLICY "Anyone can view pools" 
  ON pools FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Users can create pools" 
  ON pools FOR INSERT 
  TO public
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their pools" 
  ON pools FOR UPDATE 
  TO public
  USING (auth.uid() = creator_id);

-- Patrons policies
CREATE POLICY "Anyone can view patrons" 
  ON patrons FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Users can become patrons" 
  ON patrons FOR INSERT 
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their patron status" 
  ON patrons FOR UPDATE 
  TO public
  USING (auth.uid() = user_id);
EOF

echo "After executing the SQL, all necessary RLS policies should be set up." 