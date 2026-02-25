# FORMETALBEARD: The SECTION-97 Build Log

## What Is This Project?

SECTION-97 is a streetwear e-commerce storefront — a place to browse premium brands like Supreme, Corteiz, Balenciaga x NBA, Stussy, Nike, Aime Leon Dore, and Yard Sale. It started as static HTML/CSS/JS, then grew into a real web app with Supabase powering auth, database, and cart persistence. No frameworks, no build tools — pure vanilla JS.

---

## Tech Stack

- **HTML/CSS/JavaScript** — No frameworks. ES6 modules with `type="module"` for native browser imports.
- **Supabase** — Auth, PostgreSQL database, Row Level Security, Storage (avatars). No custom backend.
- **Fonts** — Orbitron (headings/prices), Share Tech Mono (labels/tags), Rajdhani (body/nav)
- **Icons** — Custom inline SVGs in blueprint/technical drawing style, theme-aware via `currentColor`
- **CSS Design Tokens** — M3-inspired system for shape, elevation, motion, typography, and color

---

## Key Architecture Decisions

### Modular JS with Single Responsibility
Each file does one thing. Cart broken? Check `cart.js`. Login fails? Check `auth.js`. The `type="module"` attribute makes this work natively — no Webpack, no bundler.

### Hybrid Cart (Supabase + localStorage)
- **Logged in** → Supabase (server-side, RLS-protected)
- **Guest** → localStorage (offline, zero network calls)
- **On login** → Guest cart merges into server cart
- **On logout** → Falls back to localStorage

### Optimistic UI Updates
Every cart mutation follows: `update local → render DOM → sync server in background`. The user never waits for a network round trip. Same pattern Gmail, Twitter, and Shopify use.

### Standalone Page Pattern
Each page (store, product, profile, auth) has its own HTML file, its own JS entry point, and handles its own initialization. Shared modules (cart, theme, auth) are imported. CSS classes are prefixed to avoid collisions (`pdp-*`, `profile-*`).

---

## Notable Bugs & Lessons

### The Signup Race Condition
Supabase Auth creates the user, then a database trigger creates the profile row. JS was querying the profile before the trigger finished. Fix: a `waitForProfile()` polling function that retries up to 10 times at 300ms intervals.

**Lesson:** When you depend on an async server-side process, never assume it's done. Poll or use a callback.

### Cart Badge Not Resetting on Logout
`loadLocalCart()` had no `else` branch — if localStorage was empty, the in-memory cart kept its old items. Plus the logout handler relied on an async listener instead of calling reset directly.

**Lesson:** Functions should have explicit behavior for all code paths, especially the empty/null case. Belt and suspenders — don't rely on one mechanism when you can call directly.

### The Great Cart Rewrite
After three rounds of bug fixes (slow operations, broken RPC, null/undefined mismatches), the cart was still unpredictable. We deleted all ~570 lines and rebuilt from scratch at ~280 lines. The new cart uses event delegation, in-place DOM updates, animated removal, and null-safe `cartKey` matching.

**Lesson:** Sometimes the cost of patching exceeds the cost of a clean rewrite — especially when bugs mask each other.

### XSS Was The Big One
Every product name from Supabase was going straight into `innerHTML`. An `escapeHtml()` function using `textContent` → `innerHTML` conversion fixed it. Also added Content Security Policy headers and Subresource Integrity on CDN scripts.

**Lesson:** If you use `innerHTML` with any external data, escape it first. Always.

---

## Design Evolution

### Cyberpunk Aesthetic
- Film grain overlay via CSS `feTurbulence`
- Product card scanline sweep and chromatic aberration on hover
- Blinking cursor on the SECTION-97 logo
- Staggered product grid (subtle vertical offsets and rotations)

### Auth Page: HUD Terminal
The auth page evolved from a basic form → glassmorphism card → full HUD terminal with:
- Corner bracket frames, scanline overlay, moving scan beam
- ~~Field codes in mono badges (FLD_01, FLD_02, FLD_03)~~ — removed, felt like UI overkill
- Clip-path angled submit button with shine sweep animation
- Dual photo backgrounds with parallax mouse-follow
- System status indicators and auth mode bar

### M3 Design Token System
Every visual constant centralized as CSS custom properties — shape scale (7 levels), elevation (5 shadows), motion curves (3 easings + 3 durations), state layers (hover/focus/active opacities), typography ramp, and semantic colors. Zero hardcoded values outside token definitions.

### Product Detail Pages
Image gallery, per-size stock from database, staggered entrance animations, shimmer CTA, ambient glow behind product image, and stock validation before add-to-cart.

### Profile Page: HUD Terminal Redesign
The profile page got the same HUD treatment as auth — full cyberpunk terminal aesthetic:
- Dual rotating neon avatar ring (clockwise outer + counter-clockwise inner)
- Glitch animation on username with bracket framing `[ Username ]`
- Level/XP progress bar calculated from total spent (₦10,000 = 1 XP, quadratic level thresholds)
- Rank badges that evolve with level (Newbie → Fit Rookie → Street Styler → Neon Dripper → Fit Commander → Cyber Swaglord → Drip Architect → Outfit Warlord → FitBoss 2099 → GodOfDrip.exe)
- HUD corner brackets, scanlines, and scan beam on every card
- Data-driven achievements: First Drop, Big Spender, Hype Beast, Collector, OG Member — hexagonal badges that glow when unlocked
- Tabbed section (Order History / Wishlist / Settings) with accent underlines
- Stat counter animations that count up on page load
- Field codes (STAT_01, STAT_02, STAT_03, ACH_SYS) on cards
- Full dark/light mode support with reduced glow in light mode

---

## Typography Overhaul

A full UI/UX typography audit revealed 20+ hardcoded font-size values, accessibility failures, and inconsistent brand expression. Here's what changed:

### Accessibility Fixes
- **Dark mode contrast**: Bumped `--text-secondary` from #666 to #999 and `--text-muted` from #444 to #666 — both now pass WCAG AA (4.5:1+)
- **Minimum font sizes**: Cart badge, profile stat labels, rank badges, and auth field codes all upgraded from sub-12px sizes to design token minimums (0.7-0.75rem)
- **Footer legibility**: Replaced `font-size: 0.8rem; opacity: 0.6` with proper `--text-body-sm` token and `--text-muted` color

### Token Consistency
- **20+ hardcoded values replaced** with design tokens across: product card prices, hero subtitle, sidebar filters, cart total, cart checkout button, footer elements, auth forms, profile stats, PDP price
- Every `font-family: X; font-size: Y; font-weight: Z` combo replaced with the `font:` shorthand referencing `var(--text-*)` tokens
- Auth page completely migrated: labels → `--text-label-md`, field codes → `--text-label-sm`, status bar → `--text-label-sm`, tabs → `--text-label-lg`

### Responsive Typography
- Product card titles on mobile: fixed the 600px→380px gap with fluid `clamp(0.85rem, 3vw, 1rem)` instead of hardcoded 0.8rem
- Mobile button text increased from 0.65rem (illegible) to 0.75rem
- Profile page finally has mobile typography rules (username, stat values, section titles scale down properly)

### Brand Expression
- **Neon glow** (`text-shadow: 0 0 Npx var(--glow-accent)`) added to: profile section titles, profile stat values, PDP price, footer logo, auth logo
- Product names upgraded from `--text-title-md` (0.9rem) to `--text-headline-md` (1.2rem) — no longer overshadowed by prices
- Profile section titles upgraded from `--text-title-lg` to `--text-headline-md` with glow — finally looks streetwear, not corporate
- Sidebar filter letter-spacing widened from 0.5px to 1.5px for cyberpunk breathing room

### Font Loading Optimized
- Orbitron trimmed from 6 weights (400-900) to 3 actually used (400, 600, 700)
- Rajdhani trimmed from 5 weights to 4 (dropped 300, never used)
- Saves ~40-60KB of font data on first load

---

## Checkout Flow: The Paystack Integration

### What Was Built
A 4-step single-page checkout: Cart → Shipping → Payment → Confirm. All steps live on `checkout.html` — JS swaps step visibility with no page reloads. Payment is handled by Paystack Inline (popup iframe) supporting card and bank transfer.

- **Step 1 (Cart):** Full cart review with quantity controls, item removal, real-time price updates
- **Step 2 (Shipping):** Name, address, city, zip, phone form with Nigerian phone validation (`+234` / `0` prefix)
- **Step 3 (Payment):** Paystack popup overlays the page — no custom card form (PCI compliant)
- **Step 4 (Confirm):** Order confirmed with S97-XXXX-XXXX order ID, delivery timeline, pulsing checkmark

### The Painful Debugging Session

The checkout UI was built in one pass and worked perfectly. The payment integration was a different story — **17 test payments** before one fully succeeded. Here's what went wrong and why:

**Root cause: Code was written against migration SQL files, not the live database schema.** The migration files described what the schema *should* be, but the actual Supabase tables had differences (missing columns, different types, different constraints). Every fix revealed the next mismatch.

The error cascade:
1. **CSP blocking Paystack popup** — `frame-src` only allowed `https://js.paystack.co` but the popup loads from `https://checkout.paystack.com`. Also needed `https://paystack.com` in `style-src` for their CSS. Fix: expanded CSP to cover all Paystack domains.
2. **`price` column not found** — schema cache said no `price` on `order_items`. Stripped columns to minimum.
3. **`product_name` NOT NULL violation** — proved columns DID exist, just weren't in PostgREST's cache. Added them back.
4. **`product_id` UUID vs INTEGER** — code sent `parseInt("18")` but column was UUID type. Fixed column type with ALTER TABLE.
5. **RLS policy blocking inserts** — after ALTER TABLE, RLS policy needed recreation.
6. **PostgREST schema cache stale** — after all the ALTER TABLEs, Supabase's API cache was out of sync. `NOTIFY pgrst, 'reload schema'` fixed it.
7. **`size` column doesn't exist** — the live table never had a `size` column on `order_items`. Removed from insert.
8. **Orphan orders** — each failed attempt inserted into `orders` (succeeded) then failed on `order_items`. No transaction rollback. 16 ghost orders appeared in profile with inflated total spend.

**Lesson:** ALWAYS query the live database schema (`information_schema.columns`) before writing insert/update code. Migration files are aspirational, not authoritative. Also: wrap multi-table inserts in a rollback pattern — if step 2 fails, delete step 1.

### Files Created
- `checkout.html` — Full checkout page with CSP for Paystack
- `js/ui/checkout.js` — Checkout logic, Paystack integration, order creation
- `supabase_checkout_migration.sql` — Adds `payment_reference` column to orders

### Files Modified
- `js/ui/cart.js` — Added `clearCartFull()` (clears Supabase + localStorage), wired checkout button
- `js/config/supabase.js` — Added `PAYSTACK_PUBLIC_KEY` export
- `style.css` — ~800 lines of checkout CSS (stepper, cart items, shipping form, confirmation, timeline, responsive)
- `auth.html` — Removed FLD_01/FLD_02/FLD_03 field code tags (UI simplification)

### What's Left (Tomorrow)
- [ ] UI fixes and polish on checkout page
- [ ] Mobile layout tweaks
- [ ] Re-enable RLS on `order_items` if disabled during debugging
- [ ] Add `size` column to `order_items` if size tracking is needed

---

## What's Next

- [x] Checkout flow
- [ ] UI fixes and checkout polish
- [ ] Order history improvements
- [ ] Currency localization (i18n)
- [ ] Image optimization
- [ ] Footer redesign

---

*Built by METALBEARD. Stay Metal.*
