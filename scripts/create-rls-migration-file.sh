#!/bin/bash

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Create a timestamp for the migration file
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
MIGRATION_NAME="${TIMESTAMP}_add_users_insert_policy"

# Create the migration file directly
MIGRATION_FILE="supabase/migrations/${MIGRATION_NAME}.sql"
cat > "$MIGRATION_FILE" << 'EOF'
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

echo "Migration file created at: $MIGRATION_FILE"
echo "To apply this migration to your remote database, run: npm run db:push" 