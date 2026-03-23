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

### What's Left
- [ ] Re-enable RLS on `order_items` if disabled during debugging
- [x] Add `size` column to `order_items` — needed for size tracking through checkout

---

## Mobile Navigation Drawer Redesign

The mobile hamburger menu (navigation drawer) had too many buttons — separate profile, username display, and logout all competing for attention. Cleaned it up to match real-world patterns (Nike SNKRS, StockX, GOAT):

- **Merged username + profile** into a single tappable `<a>` link with a chevron arrow → tapping the username goes to profile
- **Removed the separate profile button** — redundant with the username link
- **Moved logout to the bottom** of the drawer with `margin-top: auto` — quiet, out of the way, but always accessible
- Login/signup button shows for guests, username link shows for logged-in users (same slot, mutually exclusive)

**Lesson:** Navigation drawers should have one clear path per action. Two buttons that go to the same place is clutter, not convenience.

---

## Size Selection on Store Page

### The Problem
Clicking "Add to Bag" on the store page added items with `size: null`. The product detail page had size selection, but users shouldn't need to navigate to a separate page just to pick a size.

### The Solution
A glass overlay size picker that appears on the product card image when you tap "Add to Bag":

1. `fetchProducts()` now joins `product_sizes` table — sizes travel with products from the start
2. Sizes stored in a JS `Map` (`productSizesMap`) keyed by product ID — avoids HTML attribute escaping nightmares
3. On "Add to Bag" click: image blurs, dark frosted glass overlay fades in with size chips
4. Tap a size → item added to cart with that size → overlay collapses → brief "Added!" feedback
5. Tap the button again or click outside → overlay closes without adding

### Edge Cases Handled
- **No sizes** (empty array): adds directly, no picker
- **Single size** with stock: auto-selects, no picker
- **All sizes out of stock**: chips shown but disabled (greyed, line-through)
- **Same product, different sizes**: separate cart items via `makeKey(id, size)` composite keys

### The data-attribute Fail
First attempt stored sizes as `data-sizes='[{"size":"S","stock":5}]'` on the button. `escapeHtml(JSON.stringify(sizes))` encoded the JSON, then `JSON.parse` on the other side couldn't decode it. Sizes array was always empty — every click just said "Added!" with no picker.

Fix: exported a `Map` from `productRenderer.js` and imported it in `cart.js`. Pure JS, no HTML encoding dance.

**Lesson:** Don't shove complex data into HTML attributes. If two modules need to share structured data, use a JS data structure.

### Size in Orders
The size data wasn't flowing to orders — `checkout.js` `createOrder()` was missing `size` in the `order_items` insert. Added `size: item.size || null`. Requires `ALTER TABLE order_items ADD COLUMN size VARCHAR(20)` in Supabase.

---

## Checkout Postal Code Bug

After removing the postal code field from the shipping form HTML (previous session), `validateShipping()` in `checkout.js` still referenced `checkout-zip`. Calling `.value` on null crashed the entire payment flow — "Proceed to Payment" did nothing.

Fix: removed `zip` from the fields object and its validation line. Added optional chaining to the error-clearing loop for safety.

**Lesson:** When you remove a form field from HTML, grep for its ID across all JS files. The HTML change is half the job.

---

## Leaderboard: Top Spenders

### What Was Built
A full leaderboard page (`leaderboard.html`) ranking users by total spend. Cyberpunk aesthetic with glitch effects, animated counters, and podium cards for the top 3.

- **Podium** — Top 3 users displayed as large cards with rank badges (I, II, III), round avatars, order counts, progress bars, spend amounts, and rank titles. Works with 1-2 users too — doesn't require exactly 3.
- **Table** — Positions 4-50 with staggered row animations, abbreviated spend (₦250k, ₦1.5M), rank badges colored by tier.
- **Stats bar** — Animated counters for total spenders, total orders, total volume.
- **"Your Position"** — Shows the logged-in user's rank, stats, and badge.
- **Shared rank module** — Extracted `calculateLevel()` and `getRank()` into `js/data/ranks.js` so both profile and leaderboard use the same logic.

### Key Decisions
- Amounts abbreviated to keep the UI clean (₦177,000 → ₦177k)
- Podium renders with any number of users (1-3), not just exactly 3
- "Operators" renamed to "Spenders" — clearer language
- Profile page has a pink leaderboard link (stands out from the green accent)

### Files Created
- `leaderboard.html`, `js/ui/leaderboardPage.js`, `js/data/ranks.js`, `supabase_leaderboard_migration.sql`

### Files Modified
- `style.css` — ~600 lines of leaderboard CSS (podium cards, table rows, glitch animation, stats bar, responsive)
- `js/ui/profilePage.js` — Imports from shared `ranks.js` instead of defining its own
- `profile.html` — Added leaderboard link with pink accent

---

## Guest Checkout

### What Was Built
Non-logged-in users can now complete purchases by providing an email address at checkout. Previously, the checkout page showed "Not logged in" and blocked all access.

### How It Works
- **Auth guard removed** — `checkout.js` no longer blocks guests. Instead, it shows an email field and a "Checking out as guest" info banner.
- **Email field** — Hidden for logged-in users (they already have an email via Supabase Auth). Shown for guests with validation.
- **Paystack** — Uses the guest's email instead of `currentUser.email` for the payment popup.
- **Order creation** — The `create_validated_order` RPC now accepts `p_guest_email`, `p_shipping_name`, `p_shipping_phone`, `p_shipping_city`. Guest orders have `user_id = NULL` and `guest_email` set instead.
- **Payment verification** — The Edge Function now uses the admin client to look up orders (since guest orders have no `user_id` for RLS matching). For auth orders, it still verifies JWT ownership. For guest orders, the payment reference match is sufficient.

### Database Changes
- `orders.user_id` is now nullable
- New columns: `guest_email`, `shipping_name`, `shipping_phone`, `shipping_city`
- Constraint: every order must have either `user_id` or `guest_email` (never both null)
- The `create_validated_order` RPC is granted to both `authenticated` and `anon` roles

### Shipping Details Now Persisted
Previously, only the combined address string was saved. Name and phone were only in Paystack metadata (not our DB). Now all four fields (name, phone, address, city) are saved to the orders table — essential for fulfillment and any future admin dashboard.

**Lesson:** Always persist critical business data in YOUR database, not just in a third-party's metadata. Paystack metadata is for their dashboard, not your order management.

### Files Created
- `supabase_guest_checkout_migration.sql`

### Files Modified
- `checkout.html` — Email field, guest banner, removed auth error block
- `js/ui/checkout.js` — Guest flow branching, email validation, updated createOrder
- `supabase/functions/verify-payment/index.ts` — Handles guest orders without JWT
- `style.css` — Guest banner styles

---

## Code Cleanup

Audited the full codebase and removed:
- `showSkeletons()` from `productRenderer.js` — defined but never called
- `getCartCount()` from `cart.js` — exported but never imported
- `clearCart()` from `cart.js` — only used internally by `clearCartFull()`, no external consumers
- `NIGERIAN_STATES` array from `checkout.js` — defined for a state dropdown that was never built

**Lesson:** Dead code accumulates quietly. Periodic audits catch exports that lost their importers and variables that outlived their purpose.

---

## What's Next

- [x] Checkout flow
- [x] Mobile navigation drawer redesign
- [x] Size selection on store page
- [x] Size data in orders
- [x] Checkout postal code fix
- [x] Leaderboard (top spenders, podium, rank badges)
- [x] Guest checkout (email-based, no account required)
- [x] Full shipping details in database
- [x] Code cleanup (removed 4 unused items)
- [x] Admin dashboard (order management, product CRUD, image upload)
- [x] Sticky ATC bar on mobile PDP
- [x] Low stock / sold out badges
- [x] NEW product tags (red border, pinned to top)
- [x] Wishlist (hearts on cards/PDP, like counts, profile dropdown)
- [x] Like counts on product cards
- [x] Product snap scroll
- [x] Atomic stock decrement
- [ ] Drop countdowns / "Notify Me"
- [ ] Quick View modal
- [ ] Product reviews / ratings
- [ ] Leaderboard seasons
- [ ] PWA (offline, install prompt)
- [ ] Guest order lookup (by email + order ID)
- [ ] Currency localization (i18n)
- [ ] Image optimization
- [ ] Footer redesign

---

## Admin Dashboard

### What Was Built
A full admin command center (`dashboard.html`) for managing orders and products. Role-based access — only users with the `admin` role in their profile can see it.

- **Orders panel** — All orders in a table with status pipeline (pending → confirmed → shipped → delivered). Click any order for a detail panel with items, shipping info, and status update controls.
- **Product CRUD** — Add/edit/delete products with image upload to Supabase Storage bucket (not URL text input). File picker with preview.
- **Filters & search** — Filter by status, search by order ID or customer name.
- **Mobile responsive** — Card layout for orders table on phones, sidebar becomes an off-canvas drawer with scrim, full-screen detail panel.

### Bug: Blob URL Memory Leak
Image upload previews used `URL.createObjectURL()` which creates blob URLs that persist in memory until the page unloads. Fixed by calling `URL.revokeObjectURL()` when closing the modal or changing images.

---

## Conversion Features Sprint

After researching what high-performing streetwear sites do (KITH, StockX, GOAT, Supreme), built a batch of conversion-boosting features:

### Sticky ATC Bar (Mobile PDP)
Fixed bar at the bottom of the screen on product detail pages for mobile. Shows product name, price, and add-to-cart button — always visible even when scrolling through product details. Disappears on desktop.

### Low Stock / Sold Out Badges
Product cards now show stock status:
- **"X LEFT"** badge (amber) when total stock ≤ 10 — creates urgency
- **"SOLD OUT"** badge (grey) when all sizes have 0 stock — card gets desaturated, ATC disabled

Stock calculated by summing all sizes: `sizes.reduce((sum, s) => sum + (s.stock || 0), 0)`.

### NEW Product Tags
Products added recently get a red border and "NEW" badge. Pinned to the top of the grid and shuffled randomly among themselves so new drops always get visibility. Uses `created_at` timestamp from the database — products within the last 14 days are "new".

### Product Snap Scroll
CSS `scroll-snap-type: y proximity` on the product grid so scrolling always lands on a product row. `proximity` (not `mandatory`) so fast scrolling still works. Different `scroll-margin-top` for desktop (140px) vs mobile (80px) to account for different header heights.

### Wishlist
Heart buttons on every product card and PDP. Tap to save/unsave. Uses the same hybrid pattern as the cart:
- **Guest** → localStorage
- **Logged in** → Supabase + localStorage sync
- **On login** → Merges local + server wishlists (union)

Saved items viewable in a dropdown on the profile page (not in the store header). Each item shows image, name, price, with "View" and "Remove" actions.

### Like Counts
Each product card shows a like count next to the heart button — the total number of users who wishlisted that product. Counts are fetched from Supabase (public read policy on the wishlists table, no user data exposed — just counts grouped by product_id). Optimistic updates — the count increments/decrements instantly on tap before the server sync completes.

### Stock Decrement
Orders now atomically reduce stock. The `create_validated_order()` RPC decrements `product_sizes.stock` for each item in the order within the same transaction. If stock hits 0, the size shows as sold out.

---

## Multi-Tab Auth Bug

### The Problem
If you leave a tab open for a long time, then open a second tab and log in, the first tab's stale session interfered with the second tab. The profile query failed silently, `repairUsername()` generated a random username and overwrote the real one.

### The Fix
- Added `signOut({ scope: 'local' })` before `signInWithPassword()` to clear stale tokens without affecting other tabs' server sessions
- Guarded `repairUsername()` with `.is('username', null)` check — only updates if username is truly null, never overwrites an existing one

**Lesson:** `signOut({ scope: 'local' })` clears tokens in the current tab only. `signOut()` without scope invalidates the server session too, breaking other tabs.

---

## Profile Stats Bug (protect_profile_stats)

### The Problem
After orders, `total_spent` and `order_count` on the profile weren't updating. The `update_profile_stats()` trigger was running correctly but being blocked by `protect_profile_stats()` — a trigger meant to prevent users from tampering with their own stats.

### Root Cause
`protect_profile_stats()` checked `current_setting('role')` to distinguish user updates from trigger updates. But `current_setting('role')` is a session-level PostgreSQL GUC — it stays `'authenticated'` even inside `SECURITY DEFINER` functions. So the trigger blocked itself.

### The Fix
Changed to `current_user != 'authenticated'` — `current_user` correctly changes to the function owner inside `SECURITY DEFINER`.

**Lesson:** In PostgreSQL, session GUCs (`current_setting()`) don't change inside SECURITY DEFINER functions, but `current_user` does.

---

*Built by METALBEARD. Stay Metal.*
