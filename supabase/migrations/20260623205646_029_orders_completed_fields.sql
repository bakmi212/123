
-- Add missing fields to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_download_url TEXT;

-- Service role policies for admin API route (DO blocks to avoid duplicate errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='service_role_all_orders'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='affiliate_commissions' AND policyname='service_role_all_commissions'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_commissions" ON affiliate_commissions FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='affiliates' AND policyname='service_role_all_affiliates'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_affiliates" ON affiliates FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_licenses' AND policyname='service_role_all_user_licenses'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_user_licenses" ON user_licenses FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='affiliate_links' AND policyname='service_role_all_affiliate_links'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_affiliate_links" ON affiliate_links FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;
