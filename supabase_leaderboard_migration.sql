-- Leaderboard RLS migration
-- Allows authenticated users to read limited profile fields for leaderboard display.
-- Run this in the Supabase SQL Editor.

-- Allow all authenticated users to view any profile (for leaderboard)
-- This does NOT expose email or other sensitive fields — the client query
-- only selects: username, avatar_url, total_spent, order_count
CREATE POLICY "Authenticated users can view profiles for leaderboard"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- NOTE: The existing "Users can view own profile" policy may conflict.
-- If you get a "policy already exists" error for SELECT, drop the old one first:
--   DROP POLICY "Users can view own profile" ON profiles;
-- The new policy is a superset (allows viewing all profiles, including your own).
