-- SECTION-97 Stock Decrement Migration
-- Adds inventory enforcement to create_validated_order():
--   1. Restores quantity upper bound (1-100) lost in guest checkout migration
--   2. Adds max items per order (50)
--   3. Locks and decrements product_sizes stock atomically (prevents overselling)
--   4. Falls back to products.stock for "One Size" items without product_sizes rows
-- Run this in Supabase SQL Editor after supabase_guest_checkout_migration.sql.

-- Drop the current 7-param version to replace it cleanly
DROP FUNCTION IF EXISTS create_validated_order(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

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
    v_qty INTEGER;
    v_size TEXT;
    v_available_stock INTEGER;
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

    -- Validate max items per order
    IF jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION 'Too many items in order (max 50)';
    END IF;

    -- Calculate total, validate stock, and decrement inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;

        -- Quantity bounds check (restored from payment verification migration)
        IF v_qty < 1 OR v_qty > 100 THEN
            RAISE EXCEPTION 'Quantity must be between 1 and 100';
        END IF;

        -- Lock the product row to prevent concurrent reads during stock check
        SELECT id, name, price, image_front, stock
        INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::INTEGER
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
        END IF;

        v_size := NULLIF(v_item->>'size', '');

        -- Check and decrement per-size stock if a size is specified
        IF v_size IS NOT NULL THEN
            -- Lock the specific size row
            SELECT stock INTO v_available_stock
            FROM product_sizes
            WHERE product_id = v_product.id AND size = v_size
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Size % not available for %', v_size, v_product.name;
            END IF;

            IF v_available_stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for % (size %). Available: %, requested: %',
                    v_product.name, v_size, v_available_stock, v_qty;
            END IF;

            -- Decrement per-size stock
            UPDATE product_sizes
            SET stock = stock - v_qty
            WHERE product_id = v_product.id AND size = v_size;
        ELSE
            -- No size specified — check overall product stock
            IF v_product.stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for %. Available: %, requested: %',
                    v_product.name, v_product.stock, v_qty;
            END IF;
        END IF;

        -- Decrement the overall product stock counter
        UPDATE products
        SET stock = stock - v_qty
        WHERE id = v_product.id;

        v_total := v_total + (v_product.price * v_qty);
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

NOTIFY pgrst, 'reload schema';
