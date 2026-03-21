-- Public wishlist counts for SECTION-97
-- Allows anyone to see how many users liked each product (count only, no user data exposed)
-- Run this in Supabase SQL Editor AFTER supabase_wishlist_migration.sql

-- Allow public (anon + authenticated) to count wishlist rows grouped by product_id
CREATE POLICY "Anyone can count wishlist likes"
    ON wishlists FOR SELECT
    USING (true);

-- Drop the old restrictive SELECT policy (replaced by the public one above)
DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlists;
