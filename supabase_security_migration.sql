-- SECTION-97 Security Hardening Migration
-- Run this in the Supabase SQL Editor after all other migrations
-- Adds CHECK constraints and server-side price validation function

-- ─── CHECK Constraints ──────────────────────────────

-- Cart: quantity must be at least 1
ALTER TABLE cart_items ADD CONSTRAINT chk_cart_quantity CHECK (quantity >= 1);

-- Orders: total must be non-negative, shipping address length capped
ALTER TABLE orders ADD CONSTRAINT chk_order_total CHECK (total >= 0);
ALTER TABLE orders ADD CONSTRAINT chk_shipping_address_length CHECK (length(shipping_address) <= 300);

-- Order items: quantity >= 1, price >= 0
ALTER TABLE order_items ADD CONSTRAINT chk_order_item_quantity CHECK (quantity >= 1);
ALTER TABLE order_items ADD CONSTRAINT chk_order_item_price CHECK (price >= 0);

-- Products: price and stock must be non-negative
ALTER TABLE products ADD CONSTRAINT chk_product_price CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT chk_product_stock CHECK (stock >= 0);


-- ─── Server-Side Price Validation Function ──────────
-- Creates orders with prices looked up from the products table,
-- never trusting client-supplied prices. Called via supabase.rpc().

CREATE OR REPLACE FUNCTION create_validated_order(
    p_items JSONB,              -- [{"product_id": 1, "size": "M", "quantity": 2}, ...]
    p_shipping_address TEXT,
    p_payment_reference TEXT
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
BEGIN
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

    -- Create order with SERVER-CALCULATED total
    INSERT INTO orders (user_id, total, status, payment_reference, shipping_address)
    VALUES (auth.uid(), v_total, 'pending', p_payment_reference, p_shipping_address)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_validated_order(JSONB, TEXT, TEXT) TO authenticated;

-- Notify PostgREST to reload schema (picks up the new function)
NOTIFY pgrst, 'reload schema';
