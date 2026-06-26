-- Function to increment affiliate link clicks by short_code (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION increment_affiliate_link_clicks(p_short_code TEXT)
RETURNS TABLE(product_id UUID, product_slug TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE affiliate_links
  SET clicks = clicks + 1,
      updated_at = now()
  WHERE short_code = p_short_code;

  RETURN QUERY
  SELECT al.product_id, p.slug
  FROM affiliate_links al
  JOIN products p ON p.id = al.product_id
  WHERE al.short_code = p_short_code;
END;
$$;
