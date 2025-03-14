-- Add patrons_number column to the pools table
ALTER TABLE public.pools 
ADD COLUMN patrons_number INTEGER DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.pools.patrons_number IS 'Number of patrons expected for the pool'; 