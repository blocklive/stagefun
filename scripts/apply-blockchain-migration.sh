#!/bin/bash

# Apply the blockchain migration to the Supabase database
# This script adds blockchain-related columns to the pools table

# Load environment variables
source .env.local

# Check if the required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
  exit 1
fi

# Extract the project reference from the Supabase URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | awk -F[/:] '{print $4}')

echo "Applying blockchain migration to project: $PROJECT_REF"

# Apply the migration using the Supabase REST API
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat scripts/add-blockchain-columns.sql | tr -d '\n' | sed 's/"/\\"/g')\"}"

echo -e "\nMigration applied successfully!" 