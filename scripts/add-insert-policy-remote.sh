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
-- Add INSERT policy for users table
CREATE POLICY "Allow public creation of users" 
  ON users FOR INSERT 
  TO public
  WITH CHECK (true);
EOF

# Use PSQL to execute the SQL directly
echo "Executing SQL to add INSERT policy for users table..."
PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql -h "$PROJECT_REF.supabase.co" -U postgres -d postgres -f "$TMP_SQL_FILE"

# Clean up
rm "$TMP_SQL_FILE"

echo "INSERT policy added successfully!" 