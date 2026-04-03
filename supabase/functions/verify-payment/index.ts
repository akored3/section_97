// Supabase Edge Function — Paystack payment verification
// Verifies that the payment amount matches the order total before marking as completed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
    const cors = getCorsHeaders(req);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    try {
        const { reference, order_id } = await req.json();

        if (!reference || !order_id) {
            return new Response(
                JSON.stringify({ error: 'Missing reference or order_id' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // Service role client (bypasses RLS — used for all order lookups + updates)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ─── Look up the order ──────────────────────
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, total, status, payment_reference, user_id, guest_email')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Ownership check ────────────────────────
        if (order.user_id) {
            // Authenticated order — verify JWT caller is the owner
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
                );
            }
            const supabaseUser = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_ANON_KEY')!,
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user } } = await supabaseUser.auth.getUser();
            if (!user || user.id !== order.user_id) {
                return new Response(
                    JSON.stringify({ error: 'Order does not belong to this user' }),
                    { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
                );
            }
        } else if (!order.guest_email) {
            // Order has neither user_id nor guest_email — invalid state
            return new Response(
                JSON.stringify({ error: 'Invalid order' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // Don't re-verify already verified orders — only return true for active statuses
        if (order.status !== 'pending') {
            const isActive = ['processing', 'shipped', 'delivered'].includes(order.status);
            return new Response(
                JSON.stringify({ verified: isActive, status: order.status }),
                { headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // Ensure the reference matches what was stored at order creation
        if (order.payment_reference !== reference) {
            return new Response(
                JSON.stringify({ error: 'Payment reference mismatch' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Verify with Paystack API ─────────────────
        const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecret) {
            return new Response(
                JSON.stringify({ error: 'Payment verification unavailable' }),
                { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        const verifyRes = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${paystackSecret}` } }
        );

        const paystackData = await verifyRes.json();

        if (!paystackData.status || paystackData.data?.status !== 'success') {
            // Payment not successful — mark order as failed
            await supabaseAdmin
                .from('orders')
                .update({ status: 'failed' })
                .eq('id', order_id);

            return new Response(
                JSON.stringify({ verified: false, error: 'Payment not successful', status: 'failed' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Guest email verification ────────────────
        // For guest orders, confirm the Paystack transaction email matches the guest_email on the order.
        // This prevents third parties who know the order_id + reference from triggering verification.
        if (!order.user_id && order.guest_email) {
            const paystackEmail = paystackData.data?.customer?.email?.toLowerCase();
            if (!paystackEmail || paystackEmail !== order.guest_email.toLowerCase()) {
                return new Response(
                    JSON.stringify({ error: 'Email mismatch' }),
                    { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
                );
            }
        }

        // ─── Amount verification ──────────────────────
        // Paystack returns amount in kobo (1 NGN = 100 kobo)
        const paidAmountNaira = paystackData.data.amount / 100;
        const orderTotal = parseFloat(order.total);

        // Allow ₦1 tolerance for floating point rounding
        if (Math.abs(paidAmountNaira - orderTotal) > 1) {
            // Amount mismatch — possible manipulation
            await supabaseAdmin
                .from('orders')
                .update({ status: 'failed' })
                .eq('id', order_id);

            return new Response(
                JSON.stringify({ verified: false, error: 'Amount mismatch', status: 'failed' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // ─── All checks passed — payment verified, order stays pending for admin processing ────
        // Status remains 'pending' — admin advances it through the pipeline:
        // pending → processing → shipped → delivered
        return new Response(
            JSON.stringify({ verified: true, status: 'pending' }),
            { headers: { ...cors, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
    }
});
