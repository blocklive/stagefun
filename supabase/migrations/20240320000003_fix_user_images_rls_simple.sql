-- Run this SQL in the Supabase dashboard SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view user images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload user images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update user images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete user images" ON storage.objects;

-- Create new policies with public access
CREATE POLICY "Anyone can view user images"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-images');

CREATE POLICY "Anyone can upload user images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-images');

CREATE POLICY "Anyone can update user images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-images');

CREATE POLICY "Anyone can delete user images"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-images'); 