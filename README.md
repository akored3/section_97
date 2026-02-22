# SECTION-97

> Stay Metal

A cyberpunk streetwear e-commerce store built with vanilla JavaScript and Supabase.

## Features

- Dark/Light mode with localStorage persistence
- Product filtering by category and search
- Shopping cart (Supabase + localStorage hybrid) with liquid glass drawer
- Authentication with auto-generated usernames
- HUD terminal-style auth page (scanlines, scan beam, field codes, clip-path button)
- Product detail pages with per-size stock and image gallery
- User profiles with avatar upload and order history
- Skeleton loading and lazy loading
- Fully responsive with custom blueprint SVG icons
- Security hardened (XSS, CSP, SRI, RLS)

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (ES6 modules)
- **Backend:** Supabase (auth, PostgreSQL, Row Level Security)
- **Fonts:** Orbitron, Share Tech Mono, Rajdhani
- **Icons:** Custom inline SVGs (blueprint/technical drawing style)

## Getting Started

```bash
git clone https://github.com/akored3/section_97.git
cd section_97
```

1. Create a [Supabase](https://supabase.com) project
2. Run the three migration SQL files in the SQL Editor
3. Create a `js/config/supabase.js` with your project URL and anon key
4. Open with Live Server or `python -m http.server 8000`

## Roadmap

- [ ] Checkout flow
- [ ] Order history
- [ ] Currency localization (i18n)

## Author

**METALBEARD**

> Stay Metal
