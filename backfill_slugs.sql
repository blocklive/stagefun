-- Backfill slugs for pools that don't have them
UPDATE pools
SET slug = LOWER(
  SUBSTRING(
    MD5(id::text || EXTRACT(EPOCH FROM NOW())::text || random()::text)
    FROM 1 FOR 8
  )
)
WHERE slug IS NULL OR slug = '';

-- Show the updated pools
SELECT id, name, slug 
FROM pools 
WHERE slug IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 10; 