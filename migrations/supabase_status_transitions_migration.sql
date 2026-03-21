-- SECTION-97 Forward-Only Status Transitions Migration
-- Enforces the order status pipeline server-side:
--   pending → processing → shipped → delivered
--   Any non-terminal status → cancelled
-- Prevents backward transitions (e.g. shipped → pending).
-- Run this in Supabase SQL Editor after supabase_admin_migration.sql.

CREATE OR REPLACE FUNCTION admin_update_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_caller_role TEXT;
    v_current_idx INTEGER;
    v_new_idx INTEGER;
    v_pipeline TEXT[] := ARRAY['pending', 'processing', 'shipped', 'delivered'];
BEGIN
    -- Check caller is admin
    SELECT role INTO v_caller_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    -- Validate new status value
    IF p_new_status NOT IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Get current status
    SELECT status INTO v_current_status
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Terminal states: no changes allowed
    IF v_current_status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot change status of delivered order';
    END IF;

    IF v_current_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot change status of cancelled order';
    END IF;

    -- Cancellation is always allowed from any non-terminal state
    IF p_new_status = 'cancelled' THEN
        UPDATE orders SET status = p_new_status WHERE id = p_order_id;
        RETURN;
    END IF;

    -- Legacy 'completed' status: allow moving into the pipeline
    IF v_current_status = 'completed' THEN
        UPDATE orders SET status = p_new_status WHERE id = p_order_id;
        RETURN;
    END IF;

    -- Enforce forward-only transitions within the pipeline
    v_current_idx := array_position(v_pipeline, v_current_status);
    v_new_idx := array_position(v_pipeline, p_new_status);

    IF v_current_idx IS NULL OR v_new_idx IS NULL THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_current_status, p_new_status;
    END IF;

    IF v_new_idx <= v_current_idx THEN
        RAISE EXCEPTION 'Cannot move order backward from % to %', v_current_status, p_new_status;
    END IF;

    -- Update the order status
    UPDATE orders
    SET status = p_new_status
    WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_order_status(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
