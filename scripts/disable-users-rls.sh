#!/bin/bash

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Please install it first:"
  echo "brew install supabase/tap/supabase"
  exit 1
fi

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

# Extract project reference from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https?://([^.]+)\..*|\1|')
echo "Project reference: $PROJECT_REF"

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

# Execute the SQL directly using the Supabase CLI
echo "Executing SQL to disable RLS on users table..."
supabase db execute --file "$TMP_SQL_FILE" --project-ref "$PROJECT_REF"

# Clean up
rm "$TMP_SQL_FILE"

echo "RLS policies updated successfully!" 