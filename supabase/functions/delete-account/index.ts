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
