# SECTION-97

> Stay Metal

A cyberpunk-inspired streetwear e-commerce store featuring premium brands like Supreme, Corteiz, Balenciaga, Stussy, Nike, Aime Leon Dore, and Yard Sale. Built with vanilla JavaScript on the frontend and Supabase powering authentication, database, and cart persistence on the backend.

## Features

- **Dark/Light Mode** — Seamless theme switching with localStorage persistence
- **Product Filtering** — Filter by hoodies, t-shirts, pants, jackets, or view all
- **Shopping Cart** — Hybrid Supabase + localStorage persistence with slide-out drawer
- **Liquid Glass Cart Drawer** — Glassmorphism slide-from-right drawer that adapts to dark/light themes
- **Authentication** — Signup with auto-generated usernames, login, logout via Supabase Auth
- **Skeleton Loading** — Smooth loading states while products fetch from the database
- **Fully Responsive** — Mobile-first design with hamburger menu and full-width cart drawer on small screens
- **Glassmorphism UI** — Modern glass-effect cards, buttons, and overlays
- **Modular Architecture** — Clean ES6 module structure with single-responsibility files
- **Security Hardened** — XSS escaping, Content Security Policy, Subresource Integrity on CDN scripts
- **Resilient Cart** — Price calculations with parseFloat, pulse feedback animations, Escape-to-close

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, gradients, animations, `backdrop-filter` glassmorphism
- **JavaScript (ES6+)** — Modules, async/await, modern syntax
- **Supabase** — Authentication, PostgreSQL database, Row Level Security, cart persistence
- **Font Awesome** — Icon library
- **Google Fonts** — Space Grotesk (headers) & Poppins (body)

## Project Structure

```
new_web/
├── store.html                       # Main store page with product grid
├── auth.html                        # Login/signup page
├── style.css                        # All styling (dark/light themes, glassmorphism)
├── js/
│   ├── main.js                      # Entry point, coordinates all modules
│   ├── config/
│   │   └── supabase.js              # Supabase client config (gitignored)
│   ├── auth/
│   │   └── auth.js                  # Authentication (signup, login, logout)
│   ├── data/
│   │   ├── products.js              # Product data with Supabase fallback
│   │   └── usernames.json           # Word pools for username generation
│   ├── components/
│   │   ├── productRenderer.js       # Displays products + skeleton loading
│   │   └── filters.js               # Product filtering logic
│   └── ui/
│       ├── theme.js                 # Dark/light mode toggle
│       ├── menu.js                  # Mobile hamburger menu
│       └── cart.js                  # Shopping cart + drawer (Supabase + localStorage)
├── supabase_migration.sql           # Products table + seed data
├── supabase_cart_migration.sql      # Cart table + RLS policies
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
4. Create a `js/config/supabase.js` file with your project URL and anon key:

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
| price | INTEGER | Price in dollars |
| image_front | VARCHAR | Front image path |
| image_back | VARCHAR | Back image path (optional) |
| category | VARCHAR | hoodies, tshirts, pants, jackets, shoes, bags, other |
| brand | VARCHAR | Supreme, Corteiz, Balenciaga, Stussy, Nike, etc. |
| stock | INTEGER | Available quantity |

### `cart_items` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | References auth.users |
| product_id | INTEGER | References products |
| quantity | INTEGER | Item count |
| UNIQUE | | (user_id, product_id) prevents duplicates |

### `profiles` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | References auth.users |
| username | VARCHAR | Auto-generated unique username |
| avatar_url | VARCHAR | Profile image (optional) |

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
- **Row Level Security** — Supabase RLS policies ensure users can only access their own cart data

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
- [ ] Product detail pages
- [ ] Checkout flow
- [ ] Product image gallery/zoom
- [ ] Order history

## Author

**METALBEARD**

Built as a learning project to master vanilla JavaScript and Supabase before moving to frameworks.

> Stay Metal
