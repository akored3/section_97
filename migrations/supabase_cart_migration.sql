-- SECTION-97 Cart Table Migration
-- Run this in Supabase SQL Editor AFTER the products migration

-- Drop existing cart table if exists
DROP TABLE IF EXISTS cart_items CASCADE;

-- Create cart_items table (size-aware)
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR DEFAULT NULL,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate product+size entries per user
    UNIQUE(user_id, product_id, size)
);

-- Enable Row Level Security
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cart
CREATE POLICY "Users can view own cart" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

-- Users can add to their own cart
CREATE POLICY "Users can add to own cart" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update own cart" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete from their own cart
CREATE POLICY "Users can delete from own cart" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Function to increment cart quantity (size-aware, uses auth.uid() for user identity)
CREATE OR REPLACE FUNCTION increment_cart_quantity(p_product_id INTEGER, p_size VARCHAR DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO cart_items (user_id, product_id, size, quantity)
    VALUES (auth.uid(), p_product_id, p_size, 1)
    ON CONFLICT (user_id, product_id, size)
    DO UPDATE SET quantity = cart_items.quantity + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
