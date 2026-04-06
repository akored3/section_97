# SECTION-97

> Stay Metal

A cyberpunk streetwear e-commerce store with real payments. Built from scratch with vanilla JavaScript, Supabase, and Paystack — no frameworks, no build tools.

<!-- Add your own screenshots here -->
<!-- ![Store](screenshots/store-dark.png) -->
<!-- ![Checkout](screenshots/checkout.png) -->

---

## Features

### Store
- Product grid with category filtering (hoodies, tees, pants, jackets, shoes, bags)
- Real-time search across product names and brands
- Size selection directly on product cards (glass overlay picker with blur effect)
- Wishlist hearts on every product card with like counts (localStorage + Supabase sync)
- LOW STOCK (≤10) and SOLD OUT badges on cards
- NEW product tags with red border, pinned to top of grid
- Product snap scroll (proximity) — scroll always lands on a product row
- Dark/light mode toggle with localStorage persistence
- Skeleton loading placeholders and lazy-loaded images
- Staggered grid layout with film grain overlay and scanline hover effects

### Product Details
- Per-size stock tracking with sold-out indicators
- Image gallery with thumbnail navigation
- Add-to-cart with size selection
- Sticky add-to-cart bar on mobile
- Wishlist heart button
- **Product reviews** — verified-purchase reviews with star ratings, fit feedback (runs small/true to size/runs large), rating distribution bars, and fit consensus pills
- Star ratings displayed on store product cards

### Shopping Cart
- Hybrid persistence: Supabase for logged-in users, localStorage for guests
- Slide-out cart drawer with quantity controls and item removal
- Cart merges on login (guest items transfer to account)

### Authentication
- HUD terminal-style login/signup page
- Auto-generated usernames on signup
- Parallax background with mouse-follow effect
- 30-minute idle timeout with auto-logout

### Checkout (Paystack Integration)
- 4-step single-page flow: Cart → Shipping → Payment → Confirm
- **Guest checkout** — no account required, just provide an email
- Real payment processing via Paystack Inline (card + bank transfer)
- Full shipping details persisted to database (name, phone, address, city)
- Order creation in Supabase with payment reference tracking
- Order ID format: `S97-XXXX-XXXX`
- Delivery timeline visualization on confirmation

### Leaderboard
- Top 50 spenders ranked by total spend
- Podium cards for top 3 (works with 1-3 users)
- Table for positions 4-50
- Abbreviated spend amounts (₦250k, ₦1.5M)
- Level/rank badges from XP system
- "Your Position" section for logged-in users
- Real-time stats (total spenders, orders, volume)

### Profile
- Avatar upload with rotating ring animation
- XP/level system with rank badges
- Order history with expandable details
- Wishlist dropdown with saved products (view, remove, navigate to PDP)
- Achievement badges (unlockable)
- Stats: total spent, order count, member since

### Security
- Content Security Policy (CSP) on every page
- Subresource Integrity (SRI) on all CDN scripts (Supabase + Paystack)
- Row Level Security (RLS) on all Supabase tables
- Server-side price validation via `create_validated_order()` Postgres function
- Database CHECK constraints on price, quantity, and stock fields
- HTML escaping for user-generated content (XSS prevention)
- Avatar upload: MIME-type whitelist with extension derived from MIME (not filename)
- Input length limits on all shipping form fields (HTML + JS enforcement)
- Strict referrer policy + `X-Content-Type-Options: nosniff`
- See [SECURITY.md](SECURITY.md) for full details

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, vanilla JavaScript (ES6 modules) |
| Backend | Supabase (auth, PostgreSQL, RLS) |
| Payments | Paystack Inline (card + bank transfer). Stripe planned for international. |
| Fonts | Self-hosted woff2 — Orbitron, Share Tech Mono, Rajdhani (no external dependencies) |
| Currency | Auto-detection via IP geolocation + ExchangeRate-API (display-only conversion) |
| Icons | Custom inline SVGs (blueprint/technical drawing style) |
| Design System | M3-inspired CSS custom properties (shape, elevation, motion, color tokens) |

---

## Project Structure

```
new_web/
├── index.html                        # Main store page (Vercel entry point)
├── store.html                        # Store page (alias)
├── product.html                      # Product detail page
├── auth.html                         # Login / signup
├── profile.html                      # User profile (orders, wishlist, achievements)
├── checkout.html                     # 4-step checkout (guest + auth)
├── leaderboard.html                  # Top spenders leaderboard
├── dashboard.html                    # Admin command center
├── style.css                         # All styling
├── js/
│   ├── main.js                       # Entry point
│   ├── config/
│   │   ├── supabase.js               # Supabase client + Paystack key (gitignored)
│   │   └── currency.js               # Currency localization (IP detect → exchange rate → format)
│   ├── auth/
│   │   └── auth.js                   # Signup, login, logout, session
│   ├── data/
│   │   ├── products.js               # Product data with Supabase fallback
│   │   ├── ranks.js                  # Shared level/rank calculations
│   │   └── usernames.json            # Word pools for username generation
│   ├── components/
│   │   ├── productRenderer.js        # Product card rendering (hearts, badges, NEW tags)
│   │   └── filters.js                # Category + search filtering
│   └── ui/
│       ├── theme.js                  # Dark/light mode
│       ├── menu.js                   # Mobile navigation drawer
│       ├── cart.js                   # Cart logic (Supabase + localStorage)
│       ├── checkout.js               # Checkout flow + Paystack (guest + auth)
│       ├── wishlist.js               # Wishlist (Supabase + localStorage hybrid)
│       ├── productPage.js            # Product detail page
│       ├── profilePage.js            # Profile page (wishlist dropdown)
│       ├── leaderboardPage.js        # Leaderboard page
│       ├── dashboardPage.js          # Admin dashboard (orders, product CRUD)
│       ├── lazyLoad.js               # IntersectionObserver lazy loading
│       └── progressBar.js            # HUD progress bar animation
├── supabase/
│   └── functions/
│       └── verify-payment/index.ts   # Payment verification Edge Function
├── fonts/                            # Self-hosted woff2 font files
├── migrations/                       # 21 SQL migration files (run in order)
│   ├── supabase_migration.sql
│   ├── supabase_cart_migration.sql
│   ├── ...
│   ├── supabase_wishlist_migration.sql
│   ├── supabase_wishlist_counts_migration.sql
│   ├── supabase_stock_restore_migration.sql
│   └── supabase_payment_ref_notnull_migration.sql
├── SECURITY.md                       # Security documentation
└── images/                           # Product images
```

---

## Getting Started

### Prerequisites
- A [Supabase](https://supabase.com) project (free tier works)
- A [Paystack](https://paystack.com) test account (for checkout)

### Setup

```bash
git clone https://github.com/akored3/section_97.git
cd section_97
```

1. **Database** — Run all migration files in your Supabase SQL Editor (in order):
   - `supabase_migration.sql` — products table + seed data
   - `supabase_cart_migration.sql` — cart table + RLS
   - `supabase_orders_migration.sql` — orders + order_items tables
   - `supabase_checkout_migration.sql` — payment_reference column
   - `supabase_security_migration.sql` — CHECK constraints + server-side order validation
   - `supabase_payment_verification_migration.sql` — payment verification lockdown
   - `supabase_profiles_rls_migration.sql` — profile RLS policies
   - `supabase_payment_replay_migration.sql` — payment replay protection
   - `supabase_profile_stats_migration.sql` — profile stats trigger
   - `supabase_product_sizes_migration.sql` — product sizes table
   - `supabase_leaderboard_migration.sql` — leaderboard RLS
   - `supabase_guest_checkout_migration.sql` — guest checkout + shipping fields
   - `supabase_admin_migration.sql` — admin role, RLS policies, status update RPC
   - `supabase_admin_products_migration.sql` — product CRUD RPC for admin
   - `supabase_stock_decrement_migration.sql` — atomic stock decrement
   - `supabase_fix_profile_stats_migration.sql` — fix profile stats trigger
   - `supabase_storage_migration.sql` — Supabase Storage bucket for product images
   - `supabase_status_transitions_migration.sql` — order status transition validation
   - `supabase_wishlist_migration.sql` — wishlist table + RLS policies
   - `supabase_wishlist_counts_migration.sql` — public like count access
   - `supabase_stock_restore_migration.sql` — auto-restore stock on cancel/fail
   - `supabase_payment_ref_notnull_migration.sql` — NOT NULL payment reference

2. **Config** — Create `js/config/supabase.js`:
   ```js
   import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.2/+esm';

   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   export const PAYSTACK_PUBLIC_KEY = 'pk_test_your-key';

   export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

3. **Run** — Open with Live Server or:
   ```bash
   python -m http.server 8000
   # Visit http://localhost:8000/store.html
   ```

### Test Payment
Use Paystack's test card: `4084 0840 8408 4081`, any future expiry, CVV `408`.

---

## Roadmap

- [x] Product store with filtering and search
- [x] Authentication with auto-generated usernames
- [x] Shopping cart (hybrid persistence)
- [x] Product detail pages with stock tracking
- [x] User profiles with XP, achievements, order history
- [x] Checkout flow with Paystack payments
- [x] Size selection on store page cards
- [x] Mobile navigation drawer redesign
- [x] Leaderboard (top 50 spenders, podium, rank badges)
- [x] Guest checkout (email-based, no account required)
- [x] Full shipping details persisted to database
- [x] Admin dashboard (order management, product CRUD, image upload, mobile responsive)
- [x] Sticky ATC bar on mobile PDP
- [x] Low stock / sold out badges on product cards
- [x] NEW product tags with red border, pinned to top
- [x] Wishlist (hearts on cards/PDP, like counts, profile dropdown, Supabase + localStorage)
- [x] Product snap scroll (proximity)
- [x] Atomic stock decrement on orders
- [x] Currency conversion (auto-detect country via IP, display prices in local currency)
- [x] Self-hosted fonts (no Google Fonts dependency, FOUT-free with preloading)
- [x] Concurrency hardening (atomic cart upserts, stock restore on cancel, NOT NULL payment ref)
- [x] Rank-up FAB redesign (pill shape, shimmer, vibrate, scroll collapse on mobile)
- [ ] Stripe integration (international payments)
- [ ] Drop countdowns / "Notify Me"
- [ ] Quick View modal
- [ ] Product reviews / ratings
- [ ] Leaderboard seasons
- [ ] PWA (offline, install prompt)
- [ ] Guest order lookup (by email + order ID)
- [ ] Image optimization (WebP, responsive sizes)
- [ ] Footer redesign

---

## Author

**METALBEARD**

> Stay Metal
