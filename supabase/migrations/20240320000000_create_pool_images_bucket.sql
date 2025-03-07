-- Create a new storage bucket for pool images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pool-images', 'pool-images', true);

-- Set up storage policies for the pool-images bucket
CREATE POLICY "Anyone can view pool images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pool-images');

CREATE POLICY "Authenticated users can upload pool images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pool-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own pool images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pool-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own pool images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pool-images'
  AND auth.role() = 'authenticated'
); 