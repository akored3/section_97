-- Profile stats migration for SECTION-97
-- Adds total_spent + order_count to profiles, with a trigger to keep them in sync
-- Run this in Supabase SQL Editor AFTER the orders migration

-- Add stats columns to profiles (safe if they already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS order_count INTEGER NOT NULL DEFAULT 0;

-- Function: recalculate a user's total_spent and order_count from orders table
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine which user to update (works for INSERT, UPDATE, DELETE)
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;

    UPDATE profiles
    SET total_spent = COALESCE((
            SELECT SUM(total) FROM orders WHERE user_id = target_user_id
        ), 0),
        order_count = COALESCE((
            SELECT COUNT(*) FROM orders WHERE user_id = target_user_id
        ), 0)
    WHERE id = target_user_id;

    RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after any order is inserted, updated, or deleted
DROP TRIGGER IF EXISTS trg_update_profile_stats ON orders;
CREATE TRIGGER trg_update_profile_stats
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

-- Backfill existing data from orders already in the table
UPDATE profiles p
SET total_spent = COALESCE(s.total, 0),
    order_count = COALESCE(s.cnt, 0)
FROM (
    SELECT user_id, SUM(total) AS total, COUNT(*) AS cnt
    FROM orders
    GROUP BY user_id
) s
WHERE p.id = s.user_id;
