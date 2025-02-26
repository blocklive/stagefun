#!/bin/bash

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Please install it first:"
  echo "brew install supabase/tap/supabase"
  exit 1
fi

# Start local Supabase instance if not already running
if ! supabase status | grep -q "Started"; then
  echo "Starting local Supabase instance..."
  supabase start
fi

# Create a temporary SQL file
TMP_SQL_FILE=$(mktemp)
cat > "$TMP_SQL_FILE" << 'EOF'
-- Disable RLS for the users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- For pools and patrons tables, keep RLS enabled with appropriate policies
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view pools" ON pools;
DROP POLICY IF EXISTS "Users can create pools" ON pools;
DROP POLICY IF EXISTS "Creators can update their pools" ON pools;
DROP POLICY IF EXISTS "Anyone can view patrons" ON patrons;
DROP POLICY IF EXISTS "Users can become patrons" ON patrons;
DROP POLICY IF EXISTS "Users can update their patron status" ON patrons;

-- Pools policies
CREATE POLICY "Anyone can view pools" 
  ON pools FOR SELECT 
  USING (true);

CREATE POLICY "Users can create pools" 
  ON pools FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Creators can update their pools" 
  ON pools FOR UPDATE 
  USING (true);

-- Patrons policies
CREATE POLICY "Anyone can view patrons" 
  ON patrons FOR SELECT 
  USING (true);

CREATE POLICY "Users can become patrons" 
  ON patrons FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their patron status" 
  ON patrons FOR UPDATE 
  USING (true);
EOF

# Execute the SQL on the local database
echo "Applying RLS changes to local database..."
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f "$TMP_SQL_FILE"

# Generate a migration file
echo "Generating migration file..."
supabase db diff -f disable_users_rls

# Clean up
rm "$TMP_SQL_FILE"

echo "Migration file created successfully!"
echo "To apply this migration to your remote database, run: npm run db:push" 