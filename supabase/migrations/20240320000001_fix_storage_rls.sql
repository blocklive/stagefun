-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view pool images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pool images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own pool images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own pool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload pool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update pool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete pool images" ON storage.objects;

-- Create new policies with public access
CREATE POLICY "Anyone can view pool images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pool-images');

CREATE POLICY "Anyone can upload pool images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pool-images');

CREATE POLICY "Anyone can update pool images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pool-images');

CREATE POLICY "Anyone can delete pool images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pool-images'); 