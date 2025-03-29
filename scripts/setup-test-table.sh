#!/bin/bash

# Run this script to create the test table in your local Supabase instance

echo "Creating test table for JWT authentication testing..."

# Make sure Supabase is running
if ! supabase status | grep -q "Started"; then
  echo "Supabase is not running. Starting Supabase..."
  supabase start
fi

# Apply the migration
supabase db reset

echo "Test table has been created successfully!"
echo "You can now test JWT authentication on the profile page." 