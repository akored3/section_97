-- Checkout migration: Add payment_reference column to orders table
-- Run this in Supabase SQL Editor

-- Store Paystack transaction reference for payment reconciliation and refunds
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

-- Index for quick lookup by payment reference
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);
