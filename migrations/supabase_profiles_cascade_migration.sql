-- Fix: account deletion fails because profiles.id FK to auth.users doesn't cascade.
-- When delete-account Edge Function calls auth.admin.deleteUser(), Postgres blocks it
-- with "Database error deleting user" / code: unexpected_failure.
--
-- This migration drops the existing FK (whatever it's named) and recreates it with
-- ON DELETE CASCADE so deleting an auth.users row also deletes the profiles row.

DO $$
DECLARE
    con_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO con_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'profiles'
        AND kcu.column_name = 'id'
        AND tc.constraint_type = 'FOREIGN KEY';

    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con_name);
    END IF;
END $$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
