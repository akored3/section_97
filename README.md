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
- Dark/light mode toggle with localStorage persistence
- Skeleton loading placeholders and lazy-loaded images
- Staggered grid layout with film grain overlay and scanline hover effects

### Product Details
- Per-size stock tracking with sold-out indicators
- Image gallery with thumbnail navigation
- Add-to-cart with size selection

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
- Real payment processing via Paystack Inline (card + bank transfer)
- Order creation in Supabase with payment reference tracking
- Order ID format: `S97-XXXX-XXXX`
- Delivery timeline visualization on confirmation

### Profile
- Avatar upload with rotating ring animation
- XP/level system with rank badges
- Order history with expandable details
- Achievement badges (unlockable)
- Stats: total spent, order count, member since

### Security
- Content Security Policy (CSP) on every page
- Subresource Integrity (SRI) on CDN scripts
- Row Level Security (RLS) on all Supabase tables
- HTML escaping for user-generated content
- Strict referrer policy

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, vanilla JavaScript (ES6 modules) |
| Backend | Supabase (auth, PostgreSQL, RLS) |
| Payments | Paystack Inline (card + bank transfer) |
| Fonts | Orbitron, Share Tech Mono, Rajdhani |
| Icons | Custom inline SVGs (blueprint/technical drawing style) |
| Design System | M3-inspired CSS custom properties (shape, elevation, motion, color tokens) |

---

## Project Structure

```
new_web/
├── store.html                        # Main store page
├── product.html                      # Product detail page
├── auth.html                         # Login / signup
├── profile.html                      # User profile
├── checkout.html                     # 4-step checkout
├── style.css                         # All styling (~4000 lines)
├── js/
│   ├── main.js                       # Entry point
│   ├── config/
│   │   └── supabase.js               # Supabase client + Paystack key (gitignored)
│   ├── auth/
│   │   └── auth.js                   # Signup, login, logout, session
│   ├── data/
│   │   ├── products.js               # Product data with Supabase fallback
│   │   └── usernames.json            # Word pools for username generation
│   ├── components/
│   │   ├── productRenderer.js        # Product card rendering
│   │   └── filters.js                # Category + search filtering
│   └── ui/
│       ├── theme.js                  # Dark/light mode
│       ├── menu.js                   # Mobile navigation drawer
│       ├── cart.js                   # Cart logic (Supabase + localStorage)
│       ├── checkout.js               # Checkout flow + Paystack
│       ├── productPage.js            # Product detail page
│       ├── profilePage.js            # Profile page
│       └── lazyLoad.js              # IntersectionObserver lazy loading
├── supabase_migration.sql            # Products table + seed data
├── supabase_cart_migration.sql       # Cart table + RLS policies
├── supabase_orders_migration.sql     # Orders + order_items tables
├── supabase_checkout_migration.sql   # payment_reference column
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

1. **Database** — Run all 4 migration files in your Supabase SQL Editor (in order):
   - `supabase_migration.sql` — products table + seed data
   - `supabase_cart_migration.sql` — cart table + RLS
   - `supabase_orders_migration.sql` — orders + order_items tables
   - `supabase_checkout_migration.sql` — payment_reference column

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
- [ ] Admin dashboard (order management, product CRUD)
- [ ] Currency localization (i18n)
- [ ] Image optimization (WebP, responsive sizes)
- [ ] Footer redesign

---

## Author

**METALBEARD**

> Stay Metal
