-- Function to update a pool's raised amount based on patron commitments
CREATE OR REPLACE FUNCTION update_pool_raised_amount(p_pool_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE pools
  SET raised_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM patrons
    WHERE pool_id = p_pool_id
  )
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql; 