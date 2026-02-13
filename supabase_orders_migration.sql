-- Orders + order items tables for SECTION-97
-- Run this in the Supabase SQL Editor after setting up the base tables

-- Orders table: tracks completed purchases
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Order items: individual products in an order
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image VARCHAR(500),
    size VARCHAR(20),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Row Level Security: users can only access their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own order items"
    ON order_items FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );
