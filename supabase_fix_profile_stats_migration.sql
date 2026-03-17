-- Fix: profile stats trigger blocked by protection trigger
-- Root cause: protect_profile_stats() checks current_setting('role') which
-- remains 'authenticated' even inside SECURITY DEFINER functions (it's a
-- session-level GUC set by PostgREST). This means the stats trigger's UPDATE
-- always gets reverted, so total_spent and order_count never change.
--
-- Fix: check current_user instead. Inside SECURITY DEFINER functions,
-- current_user is the function owner (e.g. 'postgres'), not 'authenticated'.
-- Direct client updates still see current_user = 'authenticated', so
-- tamper protection is preserved.
--
-- Run this in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION protect_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- If current_user is NOT the 'authenticated' role, this UPDATE is coming
    -- from a SECURITY DEFINER function (like update_profile_stats) — allow it.
    IF current_user != 'authenticated' THEN
        RETURN NEW;
    END IF;

    -- For direct client updates: revert protected fields to their old values
    NEW.total_spent := OLD.total_spent;
    NEW.order_count := OLD.order_count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill: recalculate stats for all users since they've been blocked until now
UPDATE profiles p
SET total_spent = COALESCE(s.total, 0),
    order_count = COALESCE(s.cnt, 0)
FROM (
    SELECT user_id, SUM(total) AS total, COUNT(*) AS cnt
    FROM orders
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) s
WHERE p.id = s.user_id;
