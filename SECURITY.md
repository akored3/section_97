# SECTION-97 Security

Security measures, design decisions, and known limitations for the SECTION-97 streetwear store.

---

## Authentication & Authorization

- **Supabase Auth** handles signup, login, logout, and session management
- Sessions persist via `autoRefreshToken` and `persistSession`
- **Password policy**: minimum 12 characters enforced client-side (Supabase default minimum is 6)
- **Email confirmation** enabled — prevents account enumeration and bulk fake signups
- **Row Level Security (RLS)** enforces per-user data isolation:
  - `products` — public read (anyone can browse the store)
  - `cart_items` — users can only CRUD their own cart
  - `orders` — users can only view/create their own orders
  - `order_items` — scoped to the user's own orders via subquery
  - `profiles` — users can only read/update their own profile; INSERT limited to own ID
- **Profile stat tampering protection**: `protect_profile_stats()` trigger prevents authenticated users from modifying `total_spent` or `order_count` directly — only the server-side `update_profile_stats()` SECURITY DEFINER trigger can change these fields
- **Auto-RLS trigger** enabled on Supabase project — all new tables get RLS automatically
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
- **Payment replay protection**: UNIQUE constraint on `orders.payment_reference` — one payment = one order
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

Additional headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

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

## Pentest Audit (2026-03-02)

Full security audit against a 10-chapter e-commerce pentesting checklist. Results:

### Passed / Already Covered
- **SQL Injection** — Supabase JS SDK parameterizes all queries; `create_validated_order()` uses parameterized inputs
- **XSS** — `escapeHtml()` used consistently on all user-controlled data before `innerHTML` insertion
- **CSRF** — JWT in localStorage (not cookies), so CSRF attacks cannot work
- **Session management** — Supabase handles token generation, expiry, refresh, and invalidation
- **Price tampering** — `create_validated_order()` looks up prices server-side from the `products` table
- **Checkout bypass** — Orders stay `pending` until Edge Function verifies payment with Paystack's secret key
- **Unauthenticated access** — RLS blocks all non-public tables for anonymous users
- **Data exposure** — Profile queries select only needed fields (`username, avatar_url, total_spent, order_count`)

### Fixed During Audit
- **Profiles RLS** — Was missing; added owner-only SELECT/UPDATE/INSERT policies + stat tamper protection
- **Payment replay** — Added UNIQUE constraint on `payment_reference` (prevents reuse of payment references)
- **Security headers** — Added `Permissions-Policy` to all pages
- **Console logging** — Removed informational `console.log` calls that leaked operational details
- **Password validation** — Replaced browser native tooltip with custom error message

### Dashboard Actions Taken
- Enabled email confirmation (prevents account enumeration + bulk fake signups)
- Enabled auto-RLS trigger for new tables

### Not Applicable (features not yet built)
- NoSQL injection, file upload bypass, GraphQL introspection, MFA bypass
- Coupon reuse, refund abuse, reward points abuse, referral abuse
- Admin endpoint access (no admin dashboard yet)
- Password reset flow (not implemented yet)

### Known Limitations

These items require additional infrastructure or architectural changes:

1. **Rate limiting** — No app-level rate limiting on auth attempts, checkout, or API calls. Supabase provides some built-in rate limiting.
2. **CSP `unsafe-inline`** — Required for theme toggle; nonce-based CSP is a future improvement
3. **Stock validation** — Stock levels are not checked atomically at checkout. Overselling is possible under race conditions.
4. **Audit logging** — No logging of auth events, payment attempts, or suspicious activity
5. **Field-level encryption** — Shipping addresses stored in plaintext in the database
6. **Bot protection** — No CAPTCHA on signup/login forms. Cloudflare Turnstile recommended before going live.
7. **HSTS** — Cannot be set via meta tags; must be configured at the hosting provider level on deployment.
8. **Account deletion** — No account deletion or data export flow. Required for NDPR/GDPR compliance before launch.

---

## Edge Function Deployment

The `verify-payment` Edge Function is deployed automatically via **GitHub Actions** on every push to `main` that changes files in `supabase/functions/`.

### How it works
The workflow (`.github/workflows/deploy-edge-functions.yml`) does the following:
1. Checks out the repo
2. Installs the Supabase CLI via `supabase/setup-cli@v1`
3. Links the project using `SUPABASE_PROJECT_ID`
4. Sets the `PAYSTACK_SECRET_KEY` as a Supabase secret
5. Deploys the function with `supabase functions deploy verify-payment --no-verify-jwt`

### Required GitHub Secrets
These must be configured in the repo's **Settings > Secrets and variables > Actions**:

| Secret | Description | Format |
|--------|-------------|--------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from Supabase Dashboard > Access Tokens | Starts with `sbp_` |
| `SUPABASE_PROJECT_ID` | Project reference ID from Supabase Dashboard > Settings > General | e.g. `abcdefghijklmnop` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (test or live) | Starts with `sk_test_` or `sk_live_` |

### Manual deployment (alternative)
If you prefer deploying locally instead of via CI:
```bash
# Install Supabase CLI
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_key_here
npx supabase functions deploy verify-payment --no-verify-jwt
```

### Post-deployment
After the first deploy, run `supabase_payment_verification_migration.sql` in the Supabase SQL Editor to lock down order status updates and add cart quantity bounds.

---

*Last updated: 2026-03-02*
