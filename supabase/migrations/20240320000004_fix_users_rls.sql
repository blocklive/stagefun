-- Run this SQL in the Supabase dashboard SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Allow public creation of users" ON users;
DROP POLICY IF EXISTS "Users can insert data" ON users;

-- Create new policies with public access
CREATE POLICY "Users can view all users" 
  ON users FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public creation of users" 
  ON users FOR INSERT 
  WITH CHECK (true);

-- Temporarily disable RLS for the users table to ensure it works
-- Comment this out if you want to keep RLS enabled
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY; 