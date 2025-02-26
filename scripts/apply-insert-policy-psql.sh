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

# Extract project reference and database password
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https?://([^.]+)\..*|\1|')
DB_PASSWORD=$SUPABASE_SERVICE_ROLE_KEY

echo "Project reference: $PROJECT_REF"
echo "Connecting to database..."

# Create a temporary SQL file
TMP_SQL_FILE=$(mktemp)
cat > "$TMP_SQL_FILE" << 'EOF'
-- Enable RLS for users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it exists to avoid errors
DROP POLICY IF EXISTS "Allow public creation of users" ON users;

-- Create the INSERT policy
CREATE POLICY "Allow public creation of users" 
  ON users FOR INSERT 
  TO public
  WITH CHECK (true);
EOF

# Use psql to execute the SQL directly
echo "Executing SQL to add INSERT policy for users table..."
PGPASSWORD="$DB_PASSWORD" psql -h "$PROJECT_REF.supabase.co" -U "postgres" -d "postgres" -f "$TMP_SQL_FILE"

# Clean up
rm "$TMP_SQL_FILE"

echo "INSERT policy added successfully!" 