-- SECTION-97 Payment Reference NOT NULL Migration
-- Closes edge case where NULL payment_reference bypasses the UNIQUE constraint.
-- PostgreSQL UNIQUE allows multiple NULLs — this prevents that.
-- Run this in Supabase SQL Editor after supabase_payment_replay_migration.sql.

-- Ensure no existing NULL references (should not exist, but safety first)
-- UPDATE orders SET payment_reference = 'MISSING-' || id::TEXT WHERE payment_reference IS NULL;

-- Add NOT NULL constraint
ALTER TABLE orders
    ALTER COLUMN payment_reference SET NOT NULL;
