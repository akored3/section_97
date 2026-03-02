// Supabase configuration
// IMPORTANT: This file is gitignored - contains sensitive credentials
// See supabase.template.js for setup instructions

const SUPABASE_URL = 'https://jxxusnopdkduudrorkbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eHVzbm9wZGtkdXVkcm9ya2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTc5MzQsImV4cCI6MjA4NTczMzkzNH0.RUcjPde3h2r73hfRisViIUs5gu7TfJbvnejvIRx99xE';

// Paystack public key (test mode — swap for live key in production)
export const PAYSTACK_PUBLIC_KEY = 'pk_test_0e29a91eb94e982049be3aabfe25a531c0fe8fe3';

// Safety check - verify Supabase CDN is loaded
if (!window.supabase) {
    throw new Error(
        'Supabase library not loaded. Check that the CDN script is included in your HTML.'
    );
}

// Create the Supabase client with security enhancements
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            // Custom header for CSRF protection
            'X-Client-Info': 'section97-web-client'
        }
    }
});
