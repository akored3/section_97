-- SECTION-97 Stock Restoration Migration
-- Auto-restores product stock when an order is marked 'failed' or 'cancelled'.
-- Prevents failed/cancelled payments from permanently consuming inventory.
-- Run this in Supabase SQL Editor after supabase_stock_decrement_migration.sql.

-- Trigger function: restore stock for each item in the order
CREATE OR REPLACE FUNCTION restore_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Only fire when status changes TO failed/cancelled FROM a non-failed/cancelled state
    IF NEW.status IN ('failed', 'cancelled')
       AND (OLD.status IS DISTINCT FROM NEW.status)
       AND OLD.status NOT IN ('failed', 'cancelled')
    THEN
        -- Loop through each item in the order and restore stock
        FOR v_item IN
            SELECT product_id, size, quantity
            FROM order_items
            WHERE order_id = NEW.id
        LOOP
            -- Restore overall product stock
            UPDATE products
            SET stock = stock + v_item.quantity
            WHERE id = v_item.product_id;

            -- Restore per-size stock if a size was specified
            IF v_item.size IS NOT NULL THEN
                UPDATE product_sizes
                SET stock = stock + v_item.quantity
                WHERE product_id = v_item.product_id AND size = v_item.size;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to orders table (fires on status updates)
DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON orders;
CREATE TRIGGER trg_restore_stock_on_cancel
    BEFORE UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_order_stock();
