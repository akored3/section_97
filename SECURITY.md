# SECTION-97 Security

Security measures, design decisions, and known limitations for the SECTION-97 streetwear store.

---

## Authentication & Authorization

- **Supabase Auth** handles signup, login, logout, and session management
- Sessions persist via `autoRefreshToken` and `persistSession`
- **Row Level Security (RLS)** enforces per-user data isolation:
  - `products` — public read (anyone can browse the store)
  - `cart_items` — users can only CRUD their own cart
  - `orders` — users can only view/create their own orders
  - `order_items` — scoped to the user's own orders via subquery
- Custom `X-Client-Info` header sent with all Supabase requests

## Data Validation

### Server-Side (Database)
- **CHECK constraints** on all critical fields:
  - `cart_items.quantity >= 1`
  - `order_items.quantity >= 1`, `order_items.price >= 0`
  - `orders.total >= 0`
  - `products.price >= 0`, `products.stock >= 0`
  - `orders.shipping_address` length <= 300 characters
- **`create_validated_order()` Postgres function** — calculates order totals from the `products` table, never trusting client-supplied prices. Creates order + items atomically.

### Client-Side (Defense in Depth)
- HTML `maxlength` on shipping form: name (100), address (200), city (50), phone (20)
- JS `.slice()` enforcement as backup in `validateShipping()`
- Phone regex: `/^(\+234|0)\d{10}$/`
- `escapeHtml()` used on all dynamic DOM content to prevent XSS

## Payment Security

- **Paystack public key only** — the secret key (`sk_*`) is never in client code
- Payment amount displayed to user comes from client-side cart total (for Paystack popup)
- **Actual order total is calculated server-side** by `create_validated_order()` from product prices in the database
- Orders are created with status `'pending'` — not `'completed'`
- SRI integrity hash on Supabase CDN script (all pages)
- Paystack CDN script loaded without SRI (their CDN does not serve CORS headers required for integrity checks)

### Server-Side Payment Verification (Edge Function)
A **Supabase Edge Function** (`verify-payment`) handles payment verification:
1. Receives the Paystack `reference` and `order_id` from the client
2. Verifies the order belongs to the authenticated user (via RLS)
3. Calls `https://api.paystack.co/transaction/verify/:reference` with the **secret key** (stored as a Supabase secret, never in client code)
4. Compares the amount Paystack actually charged against the order total in the database (±₦1 tolerance for rounding)
5. Updates order status to `'completed'` (verified) or `'failed'` (mismatch/unsuccessful)

This prevents:
- **Price manipulation**: Even if an attacker modifies the Paystack popup amount, the Edge Function catches the mismatch
- **Fake payment references**: Fabricated references fail Paystack's verify API
- **Direct status manipulation**: RLS policies prevent clients from updating order status; only the Edge Function (via `service_role`) can change it

## Content Security Policy (CSP)

All HTML pages include CSP headers via `<meta>` tags:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` (+ `https://js.paystack.co` on checkout)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `connect-src 'self' https://*.supabase.co` (+ `https://*.paystack.co` on checkout)
- `img-src 'self' data: https:`
- `frame-ancestors 'none'` (prevents clickjacking)

### Why `unsafe-inline`?
The theme toggle requires an inline `<script>` that runs before DOM load to prevent a flash of the wrong theme. Removing `unsafe-inline` would require a nonce-based CSP, which is a future improvement.

Additional headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

## File Upload Security

- **MIME type whitelist**: only `image/jpeg`, `image/png`, `image/webp` accepted
- **File extension derived from MIME type** (not from user-supplied filename) — prevents extension spoofing
- **2MB file size limit**
- Files stored in user-scoped paths: `{userId}/{timestamp}.{ext}`
- Supabase Storage RLS controls access

## API Keys & Secrets

| Key | Location | Exposure | Notes |
|-----|----------|----------|-------|
| Supabase URL | `supabase.js` (gitignored) | Public by design | Identifies the project; RLS is the security layer |
| Supabase Anon Key | `supabase.js` (gitignored) | Public by design | Equivalent to a public API key; all security comes from RLS policies |
| Paystack Public Key | `supabase.js` (gitignored) | Public by design | `pk_*` keys are meant for client-side; secret key never in codebase |

The `.gitignore` entry for `supabase.js` keeps keys out of the repository as a best practice, but these keys are designed to be safe for client-side use.

## localStorage Usage

| Key | Data | Sensitive? | Notes |
|-----|------|------------|-------|
| `theme` | `'dark'` or `'light'` | No | Theme preference |
| `section97-username` | Display name | Low | Convenience cache for UI, cleared on logout |
| `section97-cart` | Cart items array | No | Fallback for unauthenticated users |

localStorage is accessible to any script on the same origin. XSS is mitigated by consistent use of `escapeHtml()` throughout the codebase.

## Input Validation

- **Product ID**: Strict numeric regex (`/^\d+$/`) — rejects trailing garbage from `parseInt`
- **Cart quantity**: Bounded 1–100 via database CHECK constraints and RPC validation

## Known Limitations

These items require additional infrastructure or architectural changes:

1. **Rate limiting** — No app-level rate limiting on auth attempts, checkout, or API calls. Supabase provides some built-in rate limiting.
2. **CSP `unsafe-inline`** — Required for theme toggle; nonce-based CSP is a future improvement
3. **Stock validation** — Stock levels are not checked atomically at checkout. Overselling is possible under race conditions.
4. **Audit logging** — No logging of auth events, payment attempts, or suspicious activity
5. **Field-level encryption** — Shipping addresses stored in plaintext in the database

---

## Edge Function Deployment

To deploy the `verify-payment` Edge Function:
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the Paystack secret key
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_key_here

# Deploy the function
supabase functions deploy verify-payment
```

After deploying, run `supabase_payment_verification_migration.sql` in the SQL Editor to lock down order status updates.

---

*Last updated: 2026-02-28*
