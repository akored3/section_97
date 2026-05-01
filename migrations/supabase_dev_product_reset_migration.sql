-- DEV-ONLY: wipe product catalog + Storage objects so the catalog can be
-- re-seeded via the new WebP-converting upload flow in dashboard.html.
-- DO NOT RUN IN PRODUCTION.
--
-- Cascade behaviour (already verified in earlier migrations):
--   products → product_sizes  ON DELETE CASCADE
--   products → cart_items     ON DELETE CASCADE
--   products → reviews        ON DELETE CASCADE
--   products → wishlists      ON DELETE CASCADE
-- order_items.product_id has NO foreign key to products, so historical
-- order records keep their orphan product_id + cached product_name/price
-- and survive this wipe intact (the correct e-commerce pattern).

DELETE FROM public.products;

-- Purge every stored image. The bucket itself remains so re-uploads work.
DELETE FROM storage.objects WHERE bucket_id = 'product-images';

-- Sanity counts — both should return 0 after the deletes above.
SELECT 'products remaining' AS label, COUNT(*) FROM public.products
UNION ALL
SELECT 'images remaining',           COUNT(*) FROM storage.objects WHERE bucket_id = 'product-images';
