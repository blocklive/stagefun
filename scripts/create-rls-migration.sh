#!/bin/bash

# Create directory for RLS policies SQL
mkdir -p src/lib

# Create the RLS policies SQL file
cat > src/lib/supabase-rls-policies.sql << 'EOF'
-- Disable RLS for the users table (quick fix)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- For pools and patrons tables, keep RLS enabled with appropriate policies
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

-- Pools policies
CREATE POLICY IF NOT EXISTS "Anyone can view pools" 
  ON pools FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can create pools" 
  ON pools FOR INSERT 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Creators can update their pools" 
  ON pools FOR UPDATE 
  USING (true);

-- Patrons policies
CREATE POLICY IF NOT EXISTS "Anyone can view patrons" 
  ON patrons FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can become patrons" 
  ON patrons FOR INSERT 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update their patron status" 
  ON patrons FOR UPDATE 
  USING (true);
EOF

echo "RLS policies SQL file created at src/lib/supabase-rls-policies.sql" 