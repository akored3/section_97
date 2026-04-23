// Supabase Edge Function — Account deletion
// Verifies the caller's JWT, then deletes their auth user (cascades all related data).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
    const cors = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    try {
        // ─── Verify the caller's identity ──────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error('[delete-account] no Authorization header');
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

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            console.error('[delete-account] invalid session:', authError);
            return new Response(
                JSON.stringify({ error: 'Invalid session' }),
                { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Delete the user via admin API ─────────────
        // Service role client — required for auth.admin.deleteUser()
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceKey) {
            console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY secret is not set');
            return new Response(
                JSON.stringify({ error: 'Server misconfigured' }),
                { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

        // ─── Anonymize the user's orders before deletion ───
        // orders.user_id has ON DELETE SET NULL, but chk_order_has_identity requires
        // user_id OR guest_email to be present. Copy the user's email into
        // guest_email first so the constraint still holds once user_id goes NULL.
        // This preserves order history as anonymous guest orders (needed for
        // financial/tax records and customer support).
        const { error: anonymizeError } = await supabaseAdmin
            .from('orders')
            .update({ guest_email: user.email })
            .eq('user_id', user.id)
            .is('guest_email', null);

        if (anonymizeError) {
            console.error('[delete-account] failed to anonymize orders:', anonymizeError);
            return new Response(
                JSON.stringify({ error: 'Failed to prepare orders for deletion' }),
                { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error('[delete-account] admin.deleteUser failed:', deleteError);
            return new Response(
                JSON.stringify({ error: 'Failed to delete account' }),
                { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...cors, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('[delete-account] uncaught error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
    }
});
