# SECTION-97 Streetwear Store

## Project Overview

A minimal, static streetwear e-commerce website featuring premium brands (Supreme, Corteiz, Balenciaga NBA collection). The site has a cyberpunk/streetwear aesthetic with the tagline "Stay Metal" and brand name "SECTION-97".

**Created by:** METALBEARD

## Tech Stack

- **Pure HTML/CSS/JavaScript** - No frameworks or build tools
- **Fonts:** Space Grotesk (700 weight for headers), Poppins (400, 600 for body)
- **Icons:** Font Awesome kit
- **No backend or package manager** - Static site only

## Project Structure

```
new_web/
├── store.html          # Main store page with product grid
├── style.css           # All styling
├── js/
│   ├── main.js                      # Entry point, coordinates all modules
│   ├── data/
│   │   └── products.js              # Product data (will move to JSON later)
│   ├── components/
│   │   ├── productRenderer.js       # Displays products to DOM
│   │   └── filters.js               # Product filtering logic
│   └── ui/
│       ├── theme.js                 # Dark/light mode toggle
│       └── menu.js                  # Mobile hamburger menu
├── images/             # Product images (Supreme, Corteiz, Balenciaga)
└── favicon.ico
```

## Key Features

- **Dark/Light Mode Toggle** - Moon button in hero section
- **Product Filtering** - Filter by hoodies, t-shirts, pants, or show all
- **Shopping Cart** - Cart button (functionality in progress)
- **Responsive Design** - Mobile hamburger menu for filters
- **Glassmorphism UI** - Modern glass-effect buttons and cards

## Design Conventions

- **Aesthetic:** Cyberpunk/streetwear with dark theme preference
- **Typography:** Bold, terminal-style headers with blinking cursor effect
- **Color Scheme:** Dark backgrounds with vibrant accents
- **UI Style:** Glass morphism, smooth animations, minimalist

## Coding Conventions

1. **ES6 Modules** - Using import/export for clean separation of concerns
2. **Modular architecture** - Each file has a single responsibility
3. **Preserve existing formatting** - Match indentation and style when editing
4. **Keep it simple** - No unnecessary abstractions or over-engineering
5. **Mobile-first responsive** - Ensure all features work on mobile
6. **NEVER over-engineer** - Only add complexity when absolutely needed. Three lines of code is better than a premature abstraction. Don't add features, helpers, or configurations that aren't immediately necessary.

## Module Organization

- **data/** - Product data and future API integration point
- **components/** - Reusable UI components (rendering, filtering)
- **ui/** - UI-specific features (theme, menu interactions)
- **main.js** - Entry point that initializes everything

## Important Notes

- **No server-side functionality** - Forms and cart are client-side only
- **Static product data** - Products defined in [script.js](script.js)
- **No build process** - Direct file editing and browser testing
- **Font Awesome dependency** - Uses kit.fontawesome.com script

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

## Product Categories

Current categories in the store:
- **Supreme** - Hoodies, caps, shorts, pants, boards
- **Corteiz** - Hoodies, jackets, sweatpants, denim
- **Balenciaga x NBA** - Hoodies, jackets, backpacks, slides

## When Making Changes

- **Small edits** - Go ahead and modify HTML/CSS/JS directly
- **Structural changes** - Ask first (new folders, external libraries, backend needs)
- **New features** - Keep the cyberpunk/streetwear aesthetic
- **Forms/Cart** - Remember this is static only, use JavaScript for client-side handling

## Future Considerations

- Shopping cart persistence (localStorage)
- Product detail pages
- Checkout flow (client-side mock)
- More product categories
- Image optimization
- SEO metadata
