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

# Extract project reference
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https?://([^.]+)\..*|\1|')
echo "Project reference: $PROJECT_REF"

# You'll need to get your Supabase access token from the dashboard
# Go to https://supabase.com/dashboard/account/tokens and create a new token
echo "Please enter your Supabase access token (from https://supabase.com/dashboard/account/tokens):"
read SUPABASE_ACCESS_TOKEN

# SQL statement (properly escaped for JSON)
SQL="ALTER TABLE users ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS \\\"Allow public creation of users\\\" ON users; CREATE POLICY \\\"Allow public creation of users\\\" ON users FOR INSERT TO public WITH CHECK (true);"

echo "Executing SQL via Management API..."
echo "SQL: $SQL"

# Execute the SQL via the Management API
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/sql" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL\"}")

echo "Response: $RESPONSE"

if [[ "$RESPONSE" == *"error"* ]]; then
  echo "Error executing SQL. Please check the response."
  exit 1
else
  echo "INSERT policy added successfully!"
fi 