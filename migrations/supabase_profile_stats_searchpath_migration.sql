-- Fix: update_profile_stats() fails with "relation profiles does not exist"
-- when invoked during account deletion.
--
-- Root cause: SECURITY DEFINER changes the executing USER to the function owner
-- but does NOT change the search_path. When supabase_auth_admin (the role that
-- runs auth.admin.deleteUser cascades) fires this trigger, its search_path
-- doesn't include 'public', so the unqualified table references fail.
--
-- Fix: schema-qualify every table reference AND pin search_path on the function
-- (defense in depth — also the PostgreSQL-recommended pattern for SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine which user to update (works for INSERT, UPDATE, DELETE)
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;

    -- Skip if no user to update (e.g. guest order, or user already deleted)
    IF target_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.profiles
    SET total_spent = COALESCE((
            SELECT SUM(total) FROM public.orders WHERE user_id = target_user_id
        ), 0),
        order_count = COALESCE((
            SELECT COUNT(*) FROM public.orders WHERE user_id = target_user_id
        ), 0)
    WHERE id = target_user_id;

    RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$;
