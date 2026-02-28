// Supabase Edge Function — Paystack payment verification
// Verifies that the payment amount matches the order total before marking as completed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { reference, order_id } = await req.json();

        if (!reference || !order_id) {
            return new Response(
                JSON.stringify({ error: 'Missing reference or order_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Auth check ───────────────────────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with the user's JWT (respects RLS)
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // Service role client for updating order status (bypasses RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ─── Verify the order belongs to the user ────
        const { data: order, error: orderError } = await supabaseUser
            .from('orders')
            .select('id, total, status, payment_reference')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Don't re-verify already completed orders
        if (order.status === 'completed') {
            return new Response(
                JSON.stringify({ verified: true, status: 'completed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Ensure the reference matches what was stored at order creation
        if (order.payment_reference !== reference) {
            return new Response(
                JSON.stringify({ error: 'Payment reference mismatch' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Verify with Paystack API ─────────────────
        const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecret) {
            console.error('PAYSTACK_SECRET_KEY not configured');
            return new Response(
                JSON.stringify({ error: 'Payment verification unavailable' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
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

            console.error(
                `Amount mismatch: paid ₦${paidAmountNaira}, order total ₦${orderTotal}, order ${order_id}`
            );

            return new Response(
                JSON.stringify({ verified: false, error: 'Amount mismatch', status: 'failed' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── All checks passed — mark as completed ────
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', order_id);

        if (updateError) {
            console.error('Failed to update order status:', updateError.message);
            return new Response(
                JSON.stringify({ error: 'Failed to update order' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ verified: true, status: 'completed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Verification error:', err.message);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
