# SECTION-97

> Stay Metal

A cyberpunk-inspired streetwear e-commerce store featuring premium brands like Supreme, Corteiz, Balenciaga, Stussy, Nike, Aime Leon Dore, and Yard Sale. Built with vanilla JavaScript on the frontend and Supabase powering authentication, database, and cart persistence on the backend.

## Features

- **Dark/Light Mode** — Theme switching with localStorage persistence
- **Product Filtering** — Filter by category or search by name/brand
- **Shopping Cart** — Hybrid Supabase + localStorage persistence, liquid glass slide-out drawer
- **Authentication** — Signup with auto-generated usernames, immersive cyberpunk auth page
- **Product Detail Pages** — Image gallery, per-size stock, stock validation, entrance animations
- **User Profile** — Avatar upload, stats dashboard, order history
- **Skeleton Loading** — Instant loading indicators for perceived performance
- **Lazy Loading** — IntersectionObserver-based progressive image loading
- **Fully Responsive** — M3 adaptive breakpoints (600/840/992px), haptic feedback on mobile
- **Security Hardened** — XSS escaping, CSP headers, SRI on CDN scripts, RLS policies
- **M3 Design Tokens** — Centralized CSS custom properties for shape, elevation, motion, typography, and color

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, M3-inspired design tokens, gradients, animations, `backdrop-filter` glassmorphism
- **JavaScript (ES6+)** — Modules, async/await, modern syntax
- **Supabase** — Authentication, PostgreSQL database, Row Level Security, cart persistence
- **Custom SVG Icons** — Inline streetwear icon pack (blueprint/technical drawing style, theme-aware via `currentColor`)
- **Google Fonts** — Orbitron (headings/prices), Share Tech Mono (labels/tags), Rajdhani (body/nav)

## Project Structure

```
new_web/
├── store.html                       # Main store page with product grid
├── product.html                     # Product detail page (PDP)
├── profile.html                     # User profile page
├── auth.html                        # Login/signup page
├── style.css                        # All styling (dark/light themes, glassmorphism)
├── js/
│   ├── main.js                      # Entry point, coordinates all modules
│   ├── config/
│   │   └── supabase.js              # Supabase client config (gitignored)
│   ├── auth/
│   │   └── auth.js                  # Authentication (signup, login, logout)
│   ├── data/
│   │   ├── products.js              # Product data + single product fetch with sizes
│   │   └── usernames.json           # Word pools for username generation
│   ├── components/
│   │   ├── productRenderer.js       # Displays products + skeleton loading
│   │   └── filters.js               # Product filtering logic
│   └── ui/
│       ├── theme.js                 # Dark/light mode toggle
│       ├── menu.js                  # Mobile hamburger menu
│       ├── cart.js                  # Shopping cart + drawer (Supabase + localStorage)
│       ├── productPage.js           # Product detail page logic (sizes, stock, add to cart)
│       ├── profilePage.js           # Profile page logic (avatar, stats, orders)
│       └── lazyLoad.js              # Lazy loading with IntersectionObserver
├── supabase_migration.sql           # Products table + seed data
├── supabase_cart_migration.sql      # Cart table + RLS policies
├── supabase_orders_migration.sql    # Orders + order_items tables + RLS
├── images/                          # Product images
└── favicon.ico
```

## Getting Started

### Clone the repository

```bash
git clone https://github.com/akored3/section_97.git
cd section_97
```

### Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase_migration.sql` in the SQL Editor (creates products table + seed data)
3. Run `supabase_cart_migration.sql` in the SQL Editor (creates cart table + RLS policies)
4. Run `supabase_orders_migration.sql` in the SQL Editor (creates orders + order_items tables + RLS)
5. Create an `avatars` storage bucket (public) with policies for authenticated upload/update/delete
6. Create a `js/config/supabase.js` file with your project URL and anon key:

```javascript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
    'YOUR_SUPABASE_URL',
    'YOUR_SUPABASE_ANON_KEY'
);
```

### Run locally

**Option 1: Python**
```bash
python -m http.server 8000
# Visit http://localhost:8000/store.html
```

**Option 2: Node.js**
```bash
npx http-server
```

**Option 3: VS Code Live Server**

Install Live Server extension → Right-click `store.html` → "Open with Live Server"

## Authentication Flow

1. User visits `auth.html` and creates an account with email + password
2. A unique username is auto-generated from word pools (e.g. "ShadowViper", "NeonWolf")
3. Supabase Auth creates the user, a database trigger creates the profile row
4. The username is saved to the profile, and the user is redirected to login
5. On login, the nav bar shows the username with a dropdown for logout

## Cart System

The cart uses a **hybrid approach** for maximum reliability:

- **Logged in** — Cart items sync to Supabase (`cart_items` table) with Row Level Security
- **Guest** — Cart items persist in localStorage
- **On login** — Any guest cart items are merged into the user's Supabase cart
- **On logout** — Falls back to localStorage

The cart drawer slides in from the right with a liquid glass effect (backdrop-filter blur + semi-transparent background) that adapts to both dark and light themes.

## Database Schema

### `products` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR | Product name |
| price | INTEGER | Price in naira (₦) |
| image_front | VARCHAR | Front image path |
| image_back | VARCHAR | Back image path (optional) |
| category | VARCHAR | hoodies, tshirts, pants, jackets, shoes, bags, other |
| brand | VARCHAR | Supreme, Corteiz, Balenciaga, Stussy, Nike, etc. |
| stock | INTEGER | Available quantity |

### `product_sizes` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| product_id | INTEGER | References products |
| size | VARCHAR | Size label (S, M, L, XL, ONE SIZE, etc.) |
| stock | INTEGER | Per-size stock count |
| UNIQUE | | (product_id, size) prevents duplicates |

### `cart_items` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | References auth.users |
| product_id | INTEGER | References products |
| size | VARCHAR | Selected size (nullable) |
| quantity | INTEGER | Item count |
| UNIQUE | | (user_id, product_id, size) prevents duplicates |

### `profiles` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | References auth.users |
| username | VARCHAR | Auto-generated unique username |
| avatar_url | VARCHAR | Profile image (optional) |

### `orders` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| user_id | UUID | References auth.users |
| total | DECIMAL(10,2) | Order total |
| status | VARCHAR(20) | Order status (default: 'completed') |
| created_at | TIMESTAMPTZ | Order timestamp |

### `order_items` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| order_id | UUID | References orders |
| product_id | INTEGER | Product reference |
| product_name | VARCHAR | Snapshot of product name |
| product_image | VARCHAR | Snapshot of product image |
| size | VARCHAR | Selected size |
| quantity | INTEGER | Item count |
| price | DECIMAL(10,2) | Item price at time of purchase |

## Product Categories

- **Supreme** — Hoodies, jackets, shirts, pants, shorts, caps, skateboards
- **Corteiz** — Hoodies, jackets, shirts, denim, sweatpants
- **Balenciaga x NBA** — Jerseys, jackets, boots, slides, backpacks
- **Stussy** — Hoodies, sweatshirts, pants
- **Nike** — Shirts, Nike x Carhartt jacket
- **Aime Leon Dore** — Sweatshirts, pants
- **Yard Sale** — Hoodies, vests, shirts, bags, cargo pants

## Design Philosophy

- **Aesthetic:** Cyberpunk meets streetwear
- **Typography:** Bold terminal-style headers with blinking cursor effect
- **Colors:** Dark backgrounds with vibrant neon green accents
- **UI:** Glassmorphism, liquid glass effects, smooth animations, minimal clutter

## Security

- **XSS Prevention** — All dynamic data is escaped via `escapeHtml()` before insertion into `innerHTML`
- **Content Security Policy** — `<meta>` CSP tags on both pages restrict script sources, API connections, and frame embedding
- **Subresource Integrity** — Supabase CDN script pinned to v2.95.2 with SHA-384 integrity hash
- **Row Level Security** — Supabase RLS policies ensure users can only access their own cart and order data
- **Storage Policies** — Avatar uploads restricted to user's own folder via Supabase Storage policies

## Roadmap

- [x] Product grid with filtering
- [x] Dark/light mode toggle
- [x] Responsive mobile design
- [x] Supabase database integration
- [x] Authentication (signup, login, logout)
- [x] Shopping cart with Supabase + localStorage hybrid
- [x] Cart drawer with liquid glass effect
- [x] Skeleton loading states
- [x] SEO meta tags
- [x] Search functionality
- [x] Security hardening (XSS, CSP, SRI)
- [x] Cart UX improvements (feedback, keyboard shortcuts, price fixes)
- [x] Perceived performance optimization (instant skeleton loading)
- [x] Lazy loading images with IntersectionObserver
- [x] Cyberpunk auth page enhancement (dual backgrounds, parallax, particles, animated borders)
- [x] Product detail pages with per-size stock, image gallery, entrance animations
- [x] User profile page with avatar upload, stats, and order history
- [x] Cart performance: optimistic UI updates for instant cart operations
- [x] Cart rewrite: clean rebuild with event delegation, animated removal, liquid glass enhancements
- [x] Mobile/UX audit: agent team review with 20+ fixes across accessibility, touch targets, contrast, and responsive layout
- [ ] Checkout flow
- [ ] Order history (populated once checkout flow is built)
- [ ] Currency localization (i18n) — auto-convert prices based on user locale

## Author

**METALBEARD**

Built as a learning project to master vanilla JavaScript and Supabase before moving to frameworks.

> Stay Metal
