// Shared CORS headers for all Edge Functions
// Restrict to production domain and local dev — prevents cross-origin abuse
const ALLOWED_ORIGINS = [
    'https://section-97.vercel.app',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
];

export function getCorsHeaders(request: Request) {
    const origin = request.headers.get('origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
}

// Legacy static export for backwards compatibility (if any function still imports corsHeaders)
export const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://section-97.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
