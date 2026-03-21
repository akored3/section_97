-- SECTION-97 Guest Checkout Migration
-- Enables guest checkout (no account required) and persists full shipping details.
-- Run this in Supabase SQL Editor after all previous migrations.

-- ─── Schema Changes ─────────────────────────────────

-- Allow guest orders (no user_id)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Guest identifier
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(254);

-- Structured shipping fields (previously only combined address was stored)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(50);

-- Every order must have either a logged-in user or a guest email
ALTER TABLE orders ADD CONSTRAINT chk_order_has_identity
    CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);

-- Basic email format validation
ALTER TABLE orders ADD CONSTRAINT chk_guest_email_format
    CHECK (guest_email IS NULL OR guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Index for future guest order lookups by email
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email) WHERE guest_email IS NOT NULL;


-- ─── Updated RPC: create_validated_order ─────────────
-- Now supports guest checkout (anon callers) and stores full shipping details.
-- Backwards compatible: new params all have DEFAULT NULL.

-- Drop old 3-param version to avoid PostgREST overload ambiguity
DROP FUNCTION IF EXISTS create_validated_order(JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_validated_order(
    p_items JSONB,
    p_shipping_address TEXT,
    p_payment_reference TEXT,
    p_guest_email TEXT DEFAULT NULL,
    p_shipping_name TEXT DEFAULT NULL,
    p_shipping_phone TEXT DEFAULT NULL,
    p_shipping_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_total DECIMAL(10,2) := 0;
    v_item JSONB;
    v_product RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Must have either authenticated user or guest email
    IF v_user_id IS NULL AND (p_guest_email IS NULL OR p_guest_email = '') THEN
        RAISE EXCEPTION 'Either authentication or guest email is required';
    END IF;

    -- Validate shipping address length
    IF length(p_shipping_address) > 300 THEN
        RAISE EXCEPTION 'Shipping address too long';
    END IF;

    -- Validate items array is not empty
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'No items provided';
    END IF;

    -- Calculate total from REAL product prices (server-side truth)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, name, price, image_front
        INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::INTEGER;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
        END IF;

        IF (v_item->>'quantity')::INTEGER < 1 THEN
            RAISE EXCEPTION 'Invalid quantity for product %', v_product.name;
        END IF;

        v_total := v_total + (v_product.price * (v_item->>'quantity')::INTEGER);
    END LOOP;

    -- Create order (user_id is NULL for guests, guest_email is NULL for auth users)
    INSERT INTO orders (
        user_id, total, status, payment_reference,
        shipping_address, guest_email,
        shipping_name, shipping_phone, shipping_city
    )
    VALUES (
        v_user_id, v_total, 'pending', p_payment_reference,
        p_shipping_address,
        CASE WHEN v_user_id IS NULL THEN p_guest_email ELSE NULL END,
        p_shipping_name, p_shipping_phone, p_shipping_city
    )
    RETURNING id INTO v_order_id;

    -- Insert order items with SERVER-SIDE prices from products table
    INSERT INTO order_items (order_id, product_id, product_name, product_image, size, quantity, product_price)
    SELECT
        v_order_id,
        (item->>'product_id')::INTEGER,
        p.name,
        p.image_front,
        NULLIF(item->>'size', ''),
        (item->>'quantity')::INTEGER,
        p.price
    FROM jsonb_array_elements(p_items) AS item
    JOIN products p ON p.id = (item->>'product_id')::INTEGER;

    RETURN v_order_id;
END;
$$;

-- Grant execute to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION create_validated_order(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_validated_order(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Notify PostgREST to reload schema (picks up the new function)
NOTIFY pgrst, 'reload schema';
