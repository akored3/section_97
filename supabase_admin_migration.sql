-- SECTION-97 Admin Dashboard Migration
-- Adds role-based access control for admin dashboard.
-- Run this in Supabase SQL Editor after all previous migrations.

-- ─── 1. Add role column to profiles ─────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Protect role from client-side tampering (add to existing stats protection trigger)
CREATE OR REPLACE FUNCTION protect_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('role') != 'authenticated' THEN
        RETURN NEW; -- Service role / trigger — allow everything
    END IF;

    -- For authenticated users: revert protected fields to their old values
    NEW.total_spent := OLD.total_spent;
    NEW.order_count := OLD.order_count;
    NEW.role := OLD.role; -- Prevent users from self-promoting to admin
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Admin RLS policies for orders ───────────────
-- Admins can view ALL orders (not just their own)
CREATE POLICY "Admins can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can view ALL order items
CREATE POLICY "Admins can view all order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ─── 3. Admin status update RPC ─────────────────────
-- Only admins can update order status. Validates status transitions.
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

    -- Validate status transitions (no changing delivered/cancelled)
    IF v_current_status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot change status of delivered order';
    END IF;

    IF v_current_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot change status of cancelled order';
    END IF;

    -- Allow 'completed' orders to be moved into the pipeline (legacy status)
    -- completed → pending/processing/shipped/delivered are all valid

    -- Update the order status
    UPDATE orders
    SET status = p_new_status
    WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_order_status(UUID, TEXT) TO authenticated;

-- ─── 4. Admin check helper RPC ──────────────────────
-- Quick check if current user is admin (used by dashboard on load)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ─── 5. Set your account as admin ───────────────────
-- IMPORTANT: Replace YOUR_USER_ID with your actual auth.uid()
-- Find it in Supabase Dashboard → Authentication → Users
--
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';
