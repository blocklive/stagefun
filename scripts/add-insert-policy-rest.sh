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

# SQL to execute
SQL="CREATE POLICY \"Allow public creation of users\" ON users FOR INSERT TO public WITH CHECK (true);"

# Execute SQL using the REST API
echo "Executing SQL to add INSERT policy for users table..."
curl -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$SQL\"}"

echo "INSERT policy added successfully!" 