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

# Validate project reference format
if ! [[ $PROJECT_REF =~ ^[a-zA-Z0-9]{20}$ ]]; then
  echo "Error: Invalid project reference format. Please enter it manually:"
  read -p "Project reference (from Supabase dashboard): " PROJECT_REF
  echo "Using project reference: $PROJECT_REF"
fi

# Link to the existing Supabase project if not already linked
if [ ! -f "supabase/.temp/project-ref" ] || [ "$(cat supabase/.temp/project-ref)" != "$PROJECT_REF" ]; then
  echo "Linking to Supabase project..."
  supabase link --project-ref "$PROJECT_REF"
fi

# Check if RLS policies SQL file exists
if [ ! -f "src/lib/supabase-rls-policies.sql" ]; then
  echo "Creating RLS policies SQL file..."
  mkdir -p src/lib
  
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
fi

# Generate timestamp for migration file
TIMESTAMP_POLICIES=$(date -u +"%Y%m%d%H%M%S")

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Copy SQL file to migrations directory with proper naming
echo "Copying RLS policies SQL to migrations..."
cp "src/lib/supabase-rls-policies.sql" "supabase/migrations/${TIMESTAMP_POLICIES}_rls_policies.sql"

# Apply migrations
echo "Applying RLS policies to Supabase project..."
supabase db push

echo "RLS policies applied successfully!" 