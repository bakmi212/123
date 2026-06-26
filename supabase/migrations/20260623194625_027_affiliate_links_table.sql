CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_affiliate_links" ON affiliate_links FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_affiliate_links" ON affiliate_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_affiliate_links" ON affiliate_links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_affiliate_links" ON affiliate_links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Service role can update clicks/conversions/earnings from edge functions / server routes
CREATE POLICY "service_role_all_affiliate_links" ON affiliate_links FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_affiliate_links_short_code ON affiliate_links(short_code);
CREATE INDEX idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX idx_affiliate_links_product_id ON affiliate_links(product_id);
