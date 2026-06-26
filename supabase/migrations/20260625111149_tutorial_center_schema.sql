/*
# Tutorial Center Schema

Adds three tables to support a per-product learning center:
  product_tutorials — tutorial videos attached to products
  product_docs      — PDF/online documentation links per product
  product_releases  — release notes / changelog per product

## New Tables

### product_tutorials
Each row is one video in a product's playlist.
- id, product_id (FK products), title, description, video_url (YouTube / Vimeo / MP4),
  video_type ('youtube' | 'vimeo' | 'mp4'), category (e.g. 'installation'), sort_order,
  duration_seconds, thumbnail_url, updated_at, created_at

### product_docs
Each row is one documentation resource.
- id, product_id, title, doc_type ('pdf' | 'online' | 'quickstart'), url, sort_order, created_at

### product_releases
Each row is one version in the changelog.
- id, product_id, version, release_date, type ('major'|'minor'|'patch'), notes (text array of bullet points), created_at

## Security
- RLS on all three tables.
- Public SELECT so the dashboard can read them (access is controlled at the application layer
  by only showing content for owned products).
- Admin (service_role + authenticated admin) can INSERT / UPDATE / DELETE.
*/

-- Tutorial videos
CREATE TABLE IF NOT EXISTS product_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'youtube' CHECK (video_type IN ('youtube','vimeo','mp4')),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('installation','activation','basic_usage','advanced','troubleshooting','faq','update_guide','general')),
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  thumbnail_url text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_tutorials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_tutorials" ON product_tutorials;
CREATE POLICY "public_select_tutorials" ON product_tutorials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_tutorials" ON product_tutorials;
CREATE POLICY "auth_insert_tutorials" ON product_tutorials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_update_tutorials" ON product_tutorials;
CREATE POLICY "auth_update_tutorials" ON product_tutorials FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_tutorials" ON product_tutorials;
CREATE POLICY "auth_delete_tutorials" ON product_tutorials FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "service_all_tutorials" ON product_tutorials;
CREATE POLICY "service_all_tutorials" ON product_tutorials FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Documentation
CREATE TABLE IF NOT EXISTS product_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'online'
    CHECK (doc_type IN ('pdf','online','quickstart')),
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_docs" ON product_docs;
CREATE POLICY "public_select_docs" ON product_docs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_docs" ON product_docs;
CREATE POLICY "auth_insert_docs" ON product_docs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_update_docs" ON product_docs;
CREATE POLICY "auth_update_docs" ON product_docs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_docs" ON product_docs;
CREATE POLICY "auth_delete_docs" ON product_docs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "service_all_docs" ON product_docs;
CREATE POLICY "service_all_docs" ON product_docs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Release notes / changelog
CREATE TABLE IF NOT EXISTS product_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version text NOT NULL,
  release_date date NOT NULL DEFAULT CURRENT_DATE,
  release_type text NOT NULL DEFAULT 'patch'
    CHECK (release_type IN ('major','minor','patch')),
  notes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_releases" ON product_releases;
CREATE POLICY "public_select_releases" ON product_releases FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_releases" ON product_releases;
CREATE POLICY "auth_insert_releases" ON product_releases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_update_releases" ON product_releases;
CREATE POLICY "auth_update_releases" ON product_releases FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_releases" ON product_releases;
CREATE POLICY "auth_delete_releases" ON product_releases FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "service_all_releases" ON product_releases;
CREATE POLICY "service_all_releases" ON product_releases FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Indexes for fast product lookups
CREATE INDEX IF NOT EXISTS idx_tutorials_product ON product_tutorials(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_docs_product ON product_docs(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_releases_product ON product_releases(product_id, release_date DESC);
