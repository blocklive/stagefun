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
# Format: https://abcdefghijklmnopqrst.supabase.co
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https?://([^.]+)\..*|\1|')
echo "Project reference: $PROJECT_REF"

# Validate project reference format
if ! [[ $PROJECT_REF =~ ^[a-zA-Z0-9]{20}$ ]]; then
  echo "Error: Invalid project reference format. Please enter it manually:"
  read -p "Project reference (from Supabase dashboard): " PROJECT_REF
  echo "Using project reference: $PROJECT_REF"
fi

# Login to Supabase (if not already logged in)
echo "Logging in to Supabase..."
supabase login

# Initialize Supabase project if not already initialized
if [ ! -d "supabase" ]; then
  echo "Initializing Supabase project..."
  supabase init
fi

# Link to the existing Supabase project
echo "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF"

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Check if SQL files exist
if [ ! -f "src/lib/supabase-schema.sql" ]; then
  echo "Error: src/lib/supabase-schema.sql does not exist"
  exit 1
fi

if [ ! -f "src/lib/supabase-functions.sql" ]; then
  echo "Error: src/lib/supabase-functions.sql does not exist"
  exit 1
fi

if [ ! -f "src/lib/supabase-rls-policies.sql" ]; then
  echo "Error: src/lib/supabase-rls-policies.sql does not exist"
  exit 1
fi

# Generate timestamps for migration files
TIMESTAMP_SCHEMA=$(date -u +"%Y%m%d%H%M%S")
TIMESTAMP_FUNCTIONS=$(date -u -v+1S +"%Y%m%d%H%M%S")  # Add 1 second to ensure unique timestamp
TIMESTAMP_POLICIES=$(date -u -v+2S +"%Y%m%d%H%M%S")   # Add 2 seconds to ensure unique timestamp

# Copy SQL files to migrations directory with proper naming
echo "Copying schema SQL to migrations..."
cp "src/lib/supabase-schema.sql" "supabase/migrations/${TIMESTAMP_SCHEMA}_initial_schema.sql"

echo "Copying functions SQL to migrations..."
cp "src/lib/supabase-functions.sql" "supabase/migrations/${TIMESTAMP_FUNCTIONS}_functions.sql"

echo "Copying RLS policies SQL to migrations..."
cp "src/lib/supabase-rls-policies.sql" "supabase/migrations/${TIMESTAMP_POLICIES}_rls_policies.sql"

# Apply migrations
echo "Applying migrations to Supabase project..."
supabase db push

echo "Database setup complete!" 