-- Profiles table RLS hardening
-- Ensures users can only read/update their own profile data
-- Run this in Supabase SQL Editor

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start clean (safe if they don't exist)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profile viewing" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 1. Users can only read their OWN profile
--    (When we build the leaderboard, we'll add a separate limited public policy)
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- 2. Users can only update their OWN profile
--    Prevents user A from changing user B's username/avatar
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Insert is handled by the auth trigger (new user signup)
--    But we need a policy so the trigger can create the row
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4. No DELETE policy — users cannot delete their profile directly
--    (Future: account deletion will be handled by an admin function or Edge Function)

-- 5. Protect server-managed fields from client tampering
--    Users should NOT be able to modify total_spent or order_count directly
--    These are only updated by the update_profile_stats() trigger (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION protect_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- If current_user is NOT the 'authenticated' role, this UPDATE is coming
    -- from a SECURITY DEFINER function (like update_profile_stats) — allow it.
    -- Note: current_setting('role') does NOT work here because it's a session-level
    -- GUC that stays 'authenticated' even inside SECURITY DEFINER functions.
    IF current_user != 'authenticated' THEN
        RETURN NEW;
    END IF;

    -- For direct client updates: revert protected fields to their old values
    NEW.total_spent := OLD.total_spent;
    NEW.order_count := OLD.order_count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_stats ON profiles;
CREATE TRIGGER trg_protect_profile_stats
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_profile_stats();
