-- Add slug column to categories table
-- This column was defined in initial schema but appears to be missing from current database

-- Add slug column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'slug'
  ) THEN
    ALTER TABLE categories ADD COLUMN slug VARCHAR(255);
  END IF;
END $$;

-- Generate slugs from names for existing categories without slugs
UPDATE categories
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'gi'))
WHERE slug IS NULL OR slug = '';

-- Make slugs unique by appending ID suffix for duplicates
UPDATE categories c1
SET slug = c1.slug || '-' || LEFT(c1.id::text, 8)
WHERE c1.slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM categories c2 
    WHERE c2.slug = c1.slug AND c2.id != c1.id AND c2.id < c1.id
  );

-- Create unique index on slug (allows NULL values but enforces uniqueness for non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_unique ON categories(slug) WHERE slug IS NOT NULL;

-- Create regular index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Add NOT NULL constraint (after backfill)
ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;

-- Add comment
COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier for the category. Used in category page URLs.';
