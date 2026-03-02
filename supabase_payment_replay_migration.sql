-- Payment replay protection for SECTION-97
-- Prevents the same Paystack payment reference from being used to create multiple orders
-- Run this in Supabase SQL Editor

-- Add UNIQUE constraint on payment_reference
-- This ensures one payment = one order, period.
-- If someone tries to replay a successful reference, the INSERT will fail.
ALTER TABLE orders
    ADD CONSTRAINT orders_payment_reference_unique UNIQUE (payment_reference);

-- Note: The existing index (idx_orders_payment_reference) is now redundant
-- since UNIQUE constraints automatically create an index.
-- Safe to drop it, but not required.
DROP INDEX IF EXISTS idx_orders_payment_reference;
