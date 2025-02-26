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

# SQL statement (properly escaped for JSON)
SQL="ALTER TABLE users ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS \\\"Allow public creation of users\\\" ON users; CREATE POLICY \\\"Allow public creation of users\\\" ON users FOR INSERT TO public WITH CHECK (true);"

echo "Executing SQL via REST API..."
echo "SQL: $SQL"

# Execute the SQL via the REST API
RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/alter_policy" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql_query\": \"$SQL\"}")

echo "Response: $RESPONSE"

if [[ "$RESPONSE" == *"error"* ]]; then
  echo "Error executing SQL. Please check the response."
  exit 1
else
  echo "INSERT policy added successfully!"
fi 