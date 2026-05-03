-- SECTION-97 Product Model Image Migration
-- Adds an optional image_model column to products. Products with a non-null
-- image_model become hero candidates on the landing page (curatorial signal:
-- "this drop deserves a model shot, surface it"). Run in Supabase SQL Editor.

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_model VARCHAR(500);

-- Index for the landing-page hero query (newest products with a model shot).
CREATE INDEX IF NOT EXISTS idx_products_image_model_id
    ON products (id DESC)
    WHERE image_model IS NOT NULL;

NOTIFY pgrst, 'reload schema';
