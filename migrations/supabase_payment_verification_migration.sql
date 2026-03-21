-- SECTION-97 Payment Verification Migration
-- Run this in the Supabase SQL Editor after deploying the verify-payment Edge Function.
-- Locks down order status updates and adds cart quantity upper bound.

-- ─── Cart Quantity Upper Bound ─────────────────────
-- Prevents abuse: nobody needs 100+ of one item
ALTER TABLE cart_items ADD CONSTRAINT chk_cart_quantity_max CHECK (quantity <= 100);

-- ─── Prevent Direct Order Status Manipulation ──────
-- Users should NOT be able to update order status directly.
-- Only the Edge Function (via service_role) can change status.

-- Drop existing permissive UPDATE policy if any
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- Users can only read their own orders (no client-side updates)
-- INSERT is handled by create_validated_order() which runs as SECURITY DEFINER
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- If there's an existing insert policy, keep it. Otherwise the RPC handles inserts.
-- The service_role (used by Edge Functions) bypasses RLS entirely,
-- so it can update order status without needing a policy.

-- ─── Update create_validated_order to validate quantity upper bound ──
CREATE OR REPLACE FUNCTION create_validated_order(
    p_items JSONB,
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
    v_qty INTEGER;
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
        v_qty := (v_item->>'quantity')::INTEGER;

        -- Quantity bounds check
        IF v_qty < 1 OR v_qty > 100 THEN
            RAISE EXCEPTION 'Quantity must be between 1 and 100';
        END IF;

        SELECT id, name, price, image_front
        INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::INTEGER;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
        END IF;

        v_total := v_total + (v_product.price * v_qty);
    END LOOP;

    -- Create order with SERVER-CALCULATED total (always 'pending' until verified)
    INSERT INTO orders (user_id, total, status, payment_reference, shipping_address)
    VALUES (auth.uid(), v_total, 'pending', p_payment_reference, p_shipping_address)
    RETURNING id INTO v_order_id;

    -- Insert order items with SERVER-SIDE prices
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

GRANT EXECUTE ON FUNCTION create_validated_order(JSONB, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
