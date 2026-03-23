# SECTION-97 Streetwear Store

## Project Stack
- **Pure HTML/CSS/JavaScript** - No frameworks, build tools, or package managers
- **Fonts:** Orbitron (400, 600, 700 for headings, brand, prices), Share Tech Mono (labels, tags, badges), Rajdhani (400-700 for body, descriptions, nav)
- **Icons:** Custom inline SVGs (streetwear icon pack — blueprint/technical drawing style, `currentColor` for theme awareness)
- **Backend:** Supabase (auth, database, cart persistence)
- Always use semantic HTML and modern CSS practices
- Prefer vanilla JavaScript unless a framework is explicitly specified

## Project Overview

A streetwear e-commerce website featuring premium brands (Supreme, Corteiz, Balenciaga NBA collection). Static frontend with Supabase as the backend (auth, database, cart). The site has a cyberpunk/streetwear aesthetic with the tagline "Stay Metal" and brand name "SECTION-97".

**Created by:** METALBEARD

## Project Structure

```
new_web/
├── index.html          # Main store page (Vercel entry point)
├── store.html          # Store page (alias)
├── product.html        # Product detail page (PDP) with sticky ATC bar on mobile
├── profile.html        # User profile page (orders, wishlist, achievements, stats)
├── auth.html           # Login/signup page
├── checkout.html       # 4-step checkout (Cart → Shipping → Payment → Confirm)
├── leaderboard.html    # Top spenders leaderboard with podium + table
├── dashboard.html      # Admin command center (order mgmt, product CRUD, mobile responsive)
├── style.css           # All styling
├── js/
│   ├── main.js                      # Entry point, coordinates all modules
│   ├── config/
│   │   └── supabase.js              # Supabase client config + Paystack key (gitignored)
│   ├── auth/
│   │   └── auth.js                  # Authentication (signup, login, logout)
│   ├── data/
│   │   ├── products.js              # Product data with Supabase fallback
│   │   ├── ranks.js                 # Shared level/rank calculations (used by profile + leaderboard)
│   │   └── usernames.json           # Word pools for username generation
│   ├── components/
│   │   ├── productRenderer.js       # Displays products to DOM (hearts, stock badges, NEW tags)
│   │   └── filters.js               # Product filtering logic
│   └── ui/
│       ├── theme.js                 # Dark/light mode toggle
│       ├── menu.js                  # Mobile hamburger menu
│       ├── cart.js                  # Shopping cart (Supabase + localStorage hybrid)
│       ├── checkout.js              # Checkout flow, Paystack integration, guest + auth orders
│       ├── wishlist.js              # Wishlist (Supabase + localStorage hybrid, hearts on cards/PDP)
│       ├── productPage.js           # Product detail page logic + wishlist heart
│       ├── profilePage.js           # Profile page logic (avatar, stats, orders, wishlist dropdown)
│       ├── leaderboardPage.js       # Leaderboard page logic (podium, table, ranks)
│       ├── dashboardPage.js         # Admin dashboard logic (orders, status updates, product CRUD, image upload)
│       ├── lazyLoad.js              # Lazy loading with IntersectionObserver
│       └── progressBar.js           # HUD progress bar animation driver
├── supabase/
│   └── functions/
│       ├── _shared/cors.ts          # Shared CORS headers for Edge Functions
│       └── verify-payment/index.ts  # Paystack payment verification (auth + guest)
├── migrations/                      # All SQL migrations (run in order in Supabase SQL Editor)
│   ├── supabase_migration.sql                       # Products table + seed data
│   ├── supabase_cart_migration.sql                  # Cart table + RLS policies
│   ├── supabase_orders_migration.sql                # Orders + order_items tables + RLS
│   ├── supabase_checkout_migration.sql              # payment_reference column on orders
│   ├── supabase_security_migration.sql              # CHECK constraints + create_validated_order() RPC
│   ├── supabase_payment_verification_migration.sql  # Payment verification lockdown + quantity bounds
│   ├── supabase_profiles_rls_migration.sql          # Profiles RLS + stat tamper protection trigger
│   ├── supabase_payment_replay_migration.sql        # UNIQUE constraint on payment_reference
│   ├── supabase_profile_stats_migration.sql         # Profile stats trigger (total_spent, order_count)
│   ├── supabase_product_sizes_migration.sql         # Product sizes table
│   ├── supabase_leaderboard_migration.sql           # Leaderboard RLS (public profile reads)
│   ├── supabase_guest_checkout_migration.sql        # Guest checkout + full shipping details
│   ├── supabase_admin_migration.sql                 # Admin role, RLS policies, status update RPC
│   ├── supabase_admin_products_migration.sql        # Product CRUD RPC for admin
│   ├── supabase_stock_decrement_migration.sql       # Atomic stock decrement in create_validated_order()
│   ├── supabase_fix_profile_stats_migration.sql     # Fix: protect_profile_stats blocking stats trigger
│   ├── supabase_storage_migration.sql               # Supabase Storage bucket for product images
│   ├── supabase_status_transitions_migration.sql    # Order status transition validation
│   ├── supabase_wishlist_migration.sql              # Wishlist table + RLS policies
│   └── supabase_wishlist_counts_migration.sql       # Public like count access
├── SECURITY.md             # Security measures, decisions, and known limitations
├── RANKS.md                # Rank system documentation
├── images/             # Product images (Supreme, Corteiz, Balenciaga)
└── favicon.ico
```

## Key Features

- **Dark/Light Mode Toggle** - Moon button in hero section
- **Product Filtering** - Filter by hoodies, t-shirts, pants, jackets, shoes, bags
- **Size Selection on Cards** - Glass overlay picker on product image with blur effect
- **Shopping Cart** - Hybrid Supabase + localStorage persistence, size-aware deduplication
- **Wishlist** - Heart buttons on cards/PDP with like counts, localStorage + Supabase hybrid, viewable on profile page
- **Authentication** - Signup with auto-generated usernames, login, logout
- **Guest Checkout** - Email-based checkout without account, full shipping details persisted to DB
- **Checkout** - 4-step flow with Paystack payments (card + bank transfer)
- **Leaderboard** - Top 50 spenders with podium (top 3) + table, abbreviated spend amounts, rank badges
- **Admin Dashboard** - Order command center with status pipeline, filters, search, detail panel, product CRUD with image upload (role-based access, mobile responsive)
- **Stock Badges** - LOW STOCK (≤10) and SOLD OUT badges on product cards
- **NEW Product Tags** - Red border + NEW badge on recently added products, pinned to top
- **Sticky ATC Bar** - Fixed add-to-cart bar on mobile PDP
- **Product Snap Scroll** - CSS scroll-snap (proximity) so scroll always lands on a product row
- **Stock Decrement** - Atomic stock reduction on order placement
- **Responsive Design** - Mobile navigation drawer with streamlined UX
- **Glassmorphism UI** - Modern glass-effect buttons and cards

## Design Conventions

- **Aesthetic:** Cyberpunk/streetwear with dark theme preference
- **Typography:** Bold, terminal-style headers with blinking cursor effect
- **Color Scheme:** Void black (#0a0a0f) with neon green accent (#00ff64), cyan-mint secondary (#00ffd5), and neon glow effects
- **UI Style:** Glass morphism, smooth animations, minimalist
- **M3 Design Tokens:** All visual constants (shape, elevation, motion, state, typography, color) are defined as CSS custom properties in `:root`. Never use hardcoded `border-radius`, `font-family`, `box-shadow`, transition timing, or accent colors — always reference the appropriate token (`var(--shape-md)`, `var(--font-body)`, `var(--elevation-2)`, `var(--motion-standard)`, `var(--accent)`, etc.)

## Coding Conventions

1. **ES6 Modules** - Using import/export with ES6+ syntax (const/let, arrow functions, template literals)
2. **Modular architecture** - Each file has a single responsibility
3. **Preserve existing formatting** - Match indentation and style when editing
4. **Mobile-first responsive** - Ensure all features work on mobile
5. **NEVER over-engineer** - Only add complexity when absolutely needed. Three lines of code is better than a premature abstraction. Don't add features, helpers, or configurations that aren't immediately necessary.

## File Creation Conventions
- When creating new files, always include a brief comment header describing the file's purpose
- HTML files should include proper DOCTYPE, meta charset, and viewport meta tag

## Important Notes

- **No build process** - Direct file editing and browser testing
- **Font Awesome dependency** - Uses kit.fontawesome.com script
- **supabase.js is gitignored** - Contains API keys, never commit

## Local Development

Open files directly in browser or run a local server:

```bash
# Python simple server
python -m http.server 8000
# Visit http://localhost:8000/store.html
```

## Testing

- Use browser DevTools for debugging
- Test in Chrome and Edge on Windows
- Check mobile responsiveness in DevTools device emulator
- Verify dark/light mode toggle functionality

## When Making Changes

- **Small edits** - Go ahead and modify HTML/CSS/JS directly
- **Structural changes** - Ask first (new folders, external libraries, backend needs)
- **New features** - Keep the cyberpunk/streetwear aesthetic

## Task Completion
- Before marking a task as done, verify all files are fully written and saved
- Do not leave placeholder or TODO comments unless explicitly asked
- If a task requires multiple files, create all of them before stopping

## Keeping Documentation Up To Date
**IMPORTANT: Always update these files after completing features or significant changes:**

- **README.md** — Update features list, project structure, database schema, and roadmap
- **FORMETALBEARD.md** — Add new sections covering what was built, how it works, bugs encountered, and lessons learned. Keep the engaging writing style.
- **CLAUDE.md** — Update project structure, future considerations, and any new conventions
- **SKILL.md** — Add new proven patterns/techniques learned during implementation

Do NOT wait until the user asks — proactively update these files after every major feature or bug fix. Documentation that falls behind the code is worse than no documentation.

## Git Workflow
**IMPORTANT: Always push changes to GitHub after completing work**

After making changes:
1. Stage all relevant files with git add
2. Create a descriptive commit message without the co-author tag
3. Push to the remote repository
4. Do NOT include "Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" in commit messages

Example commit flow:
```bash
git add .
git commit -m "Add feature: [description of what was changed]"
git push
```

## Future Considerations

- Username editing (planned as a paid feature)
- GRANDMASTER messaging system — admin-to-user inbox, broadcast announcements, rank-up congrats, new drop alerts, discount promos, scheduled messages, HUD-styled message cards
- Drop countdowns / "Notify Me" for upcoming products
- Quick View modal on store cards
- Product reviews / ratings
- Leaderboard seasons
- PWA (offline, install prompt)
- Image optimization (WebP, responsive sizes)
- Currency localization (i18n) — detect user locale, convert ₦ prices via exchange rate API
- Footer redesign
- Guest order lookup — allow guests to find past orders by email + order ID
