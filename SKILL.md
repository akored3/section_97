---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Proven Patterns & Techniques (Learned from SECTION-97)

### Preventing UI Flash (FOUC)
- **localStorage sync pattern**: Cache state (theme, username, preferences) in localStorage, then read it synchronously in an inline `<script>` before the body renders. The async "real" check overwrites later. Same pattern works for any state that causes a visual flash on page load.
- Example: theme toggle saves to localStorage → inline script reads it before paint → no dark-to-light flicker.

### CSS Pseudo-Element Effects
- **Shimmer sweep on buttons**: `::after` pseudo with a `linear-gradient(90deg, transparent → white → transparent)` that animates `left: -100%` to `left: 100%` on hover. Creates a specular highlight sweep without JS.
- **Ambient glow behind images**: `::before` pseudo with `radial-gradient` + `filter: blur(40px)` + `z-index: -1`. Subtle colored light bleed that adds depth. Works because `position: sticky/relative` on the parent creates a stacking context.
- **Film grain overlay**: `body::before` with a noise SVG filter applied globally — adds texture without per-element work.

### Entrance Animations
- **Staggered fade-in-up**: Use `animation-fill-mode: both` so elements stay invisible (`opacity: 0`) until their animation starts. Stagger with `animation-delay` (e.g., gallery at 0s, info at 0.1s). Trigger by adding a class (`.pdp-enter`) after content is ready.
- Always wrap in `@media (prefers-reduced-motion: reduce)` to disable for accessibility.

### Skeleton Loading
- Show skeleton placeholders **immediately** (before any async work). Use CSS `background: linear-gradient` with `@keyframes` shimmer to animate the placeholder. Hide skeleton + show real content only after data arrives.
- This is perceived performance — the page feels fast even if the data fetch is slow.

### Glassmorphism
- `backdrop-filter: blur()` + semi-transparent `background` + subtle `border` with low-opacity white. Always provide a solid-color fallback for browsers that don't support `backdrop-filter`. Works best on dark themes; on light themes, reduce blur and increase background opacity.

### Fluid Typography
- Use `clamp(min, preferred, max)` instead of media query breakpoints for font sizes. Example: `font-size: clamp(1.5rem, 4vw, 2.5rem)`. One line replaces a base rule + mobile override.

### Size/Variant-Aware Cart Systems
- Use a **composite key** (`${productId}-${size}`) instead of just product ID for deduplication. Same product in different sizes = different cart entries. This applies to any variant system (color, size, etc.)
- Validate stock per-variant, not just per-product.

### Standalone Page Architecture
- Each page (PDP, profile, etc.) follows the same pattern: own HTML file, own JS entry point via `DOMContentLoaded`, inline theme flash prevention script, three-state rendering (skeleton → content → error).
- Shared modules (cart, theme, auth) are imported — page-specific logic stays isolated. This scales cleanly for every new page.

### Supabase Storage Upload Pattern
- Client-side validation first (file type, size), then delete old files before uploading new ones. Use `{userId}/{timestamp}.{ext}` paths — the timestamp prevents browser cache issues.
- Supabase Storage policies enforce server-side security: users can only write to their own `{userId}/` folder. Client validation is UX; server policies are security.

### Data URI Default Avatars
- Generate an SVG with the user's initial as a `data:image/svg+xml` URI. No network request needed, matches site aesthetic, and works as an `onerror` fallback if a real avatar URL breaks.

### Relational Queries in Supabase
- Use Supabase's nested select syntax to join related tables in one query: `.select('id, total, order_items (product_name, price)')`. One round trip instead of N+1 queries. Compute derived values (totals, counts) client-side from the response.

### Optimistic UI Updates for Cart/CRUD Operations
- When mutating server state (add/remove/update), update the local array and re-render the UI **first**, then fire the server mutation in the background. Eliminates perceived latency from network round trips.
- Pattern: `localUpdate() → renderUI() → await serverMutation()` instead of `await serverMutation() → await serverReload() → renderUI()`.
- Especially effective when you already have a local fallback (like localStorage). If the server write fails, local state is still correct, and the next page load will resync.
- Never reload the full dataset from the server after every mutation — that's the main performance killer. Trust the local state.
- **Critical:** When reading local state for the server sync, use the same lookup logic as the local update. Don't use a different key/comparison that might mismatch (e.g., `null` vs `undefined` for optional fields).

### Null vs Undefined: Database Boundaries
- PostgreSQL NULL becomes JavaScript `null` via Supabase. Missing JS object properties are `undefined`. `null === undefined` is **false** in strict equality.
- At database boundaries, normalize optional fields: use `value || null` consistently when sending to DB, and use `cartKey`-based lookups instead of field-by-field comparison to avoid mismatches.
- If you have a try/catch with a fallback, log the error on the primary path. A silent fallback can hide a completely broken primary path for months.

### Supabase Null-Safe Queries
- `.eq('column', value)` works for non-null values. For NULL, you must use `.is('column', null)`. Build a helper: `function withSize(q, size) { return size ? q.eq('size', size) : q.is('size', null); }` — use it everywhere to avoid forgetting.

### Event Delegation for Dynamic Content
- When content is rendered via `innerHTML` (cart items, product cards), attaching listeners to individual elements is fragile — they get destroyed on re-render. Instead, attach ONE listener to the static parent container and use `e.target.closest('[data-action]')` to identify which button was clicked. Zero listener leaks, works across re-renders.

### In-Place DOM Updates vs Full Re-Render
- For frequent small changes (quantity +/-, price updates), update the specific DOM element directly instead of re-rendering the entire container. This avoids re-triggering entrance animations and provides smoother UX.
- Use full re-render only for structural changes (add/remove items). Pattern: `updateItemInPlace()` returns `true` if it succeeded, falls back to `renderDrawer()` if the element wasn't found.

### When to Rewrite vs Patch
- If you can't confidently explain what every line does, the code has accumulated too much accidental complexity.
- A successful rewrite bakes in all the lessons from the original. The new version should be shorter, handle more edge cases, and be easier to extend.
- Keep the UI scaffolding (HTML/CSS) when possible — the visual layer is usually fine, it's the logic that rots.

### M3-Inspired Design Token System
- Define all visual constants (shape, elevation, motion, color) as CSS custom properties in `:root`. Every component references tokens, never magic numbers.
- **Shape scale:** 7 levels from `--shape-none` (0px) to `--shape-full` (9999px). Map every `border-radius` to one.
- **Elevation:** 5 shadow levels. Cards at 1, hover at 3, overlays at 5.
- **Motion:** Define easing curves (`--motion-standard`, `--motion-emphasized`, `--motion-spring`) and durations (`--duration-short/medium/long`). Every `transition` references these.
- **State layers:** Use RGB triplet tokens (`--state-layer: 0, 255, 0`) with `rgba(var(--state-layer), opacity)` for theme-aware hover/focus/pressed states. Eliminates duplicate theme selectors.
- **Typography ramp:** CSS `font` shorthand tokens (`--text-body-md: 400 0.9rem/1.5 var(--font-body)`) keep type consistent and reduce property count.
- **Gradient tokens:** For gradient buttons, define `--accent-dim` and `--accent-bright` per theme — `var(--accent)` alone isn't enough for two-stop gradients.
- **Key discipline:** Adding tokens is worthless unless you *replace every hardcoded instance*. Two systems (tokens + magic numbers) is worse than one.

### M3 Adaptive Design — Responsive Breakpoints
- **Use M3 window size classes**, not arbitrary breakpoints: Compact (<600px), Medium (600–840px), Expanded (840px+). These match real device categories and create consistency across projects.
- **Font sizes in `rem`, never `px`** — so text scales when users change their browser/OS font size. Formula: `px / 16 = rem`. Hardcoded `px` font-sizes break accessibility.
- **Touch targets minimum 48px** on mobile — buttons, icons, anything tappable. Smaller targets cause mis-taps. Cart quantity buttons and icon-only buttons are common offenders.
- **Cart drawer goes full-width at Compact** — on a 375px phone, a 420px drawer creates horizontal scroll. Full-width at ≤600px feels native.
- **Text truncation follows content hierarchy**: truncate informational text (product names, usernames, emails) with `text-overflow: ellipsis`, but NEVER truncate actionable text (buttons, tabs, navigation labels). The parent flex container needs `min-width: 0` for ellipsis to work.
- **Haptic feedback on mobile** — `navigator.vibrate(35)` on button taps gives tactile confirmation. Feature-check with `if (navigator.vibrate)` so it's a no-op on desktop/iOS Safari.

### Touch vs Hover Device Detection
- Use `@media (hover: hover)` to wrap hover-only behaviors. Elements that are invisible by default and shown on hover (gallery arrows, tooltips) are unreachable on touch devices. Set a visible default, then override to hover-only behavior inside the media query.
- Pattern: `.element { opacity: 0.35; }` (touch default) → `@media (hover: hover) { .element { opacity: 0; } .parent:hover .element { opacity: 0.7; } }`.

### `.hidden` Utility Class Pattern
- Use a `.hidden { display: none !important; }` CSS class instead of `style="display: none;"` inline styles. Toggle with `classList.add('hidden')` / `classList.remove('hidden')` in JS.
- Inline styles override everything and can't be inspected or overridden cleanly in CSS. Class-based visibility keeps control in the stylesheet and is easier to debug.

### CSS `min()` for Responsive Widths
- Instead of fixed pixel widths that overflow on small screens, use `width: min(280px, calc(100vw - 80px))`. Gets the ideal width on large screens but never overflows on small ones.

### Design System Enforcement
- Inline `<style>` blocks in HTML files are the #1 way pages silently leave a design token system. Every visual value should reference a token — if you see hardcoded hex colors, px border-radius, or font-family strings outside of `:root` token definitions, it's a violation.
- When moving inline styles to the shared stylesheet, rename conflicting `@keyframes` (e.g., `grain` → `auth-grain`) to avoid collisions with existing animations.

### Guest Checkout with SECURITY DEFINER RPC
- When your order creation RPC is `SECURITY DEFINER`, it already bypasses RLS. To support guest (anon) checkout: (1) make `user_id` nullable, (2) add a `guest_email` column, (3) GRANT EXECUTE to the `anon` role. The RPC reads `auth.uid()` internally — it's NULL for anon callers, so use a CASE expression to store `guest_email` only when `user_id` is NULL.
- Add a CHECK constraint `(user_id IS NOT NULL OR guest_email IS NOT NULL)` to prevent orphan orders.
- For Edge Functions, use the admin/service-role client to look up guest orders (they have no user_id for RLS). For auth orders, still verify JWT ownership.

### Incremental SQL Migrations
- Each migration file is a specific change at a point in time. Run each once. Don't consolidate until the schema stabilizes. If a migration fails partway, run remaining statements individually.
- When adding constraints to existing tables, always check for violating rows first. A CHECK constraint fails if any existing row violates it.

### Shared Module Extraction
- When two pages need the same business logic (e.g., level/rank calculations), extract to a shared module and import from both. One source of truth, two consumers.

### Amount Abbreviation for Currency Display
- For leaderboards and stats, abbreviate: `≥1M → X.XM`, `≥1k → Xk`, else raw number. Don't use `toLocaleString()` for abbreviated display.

### SVG in HTML Attributes
- Never inject raw SVG markup via `onerror="this.outerHTML='${svg}'"` — the double quotes inside SVG attributes break the HTML attribute parsing, causing quote fragments to leak as visible text. Instead, use `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"` with a hidden sibling fallback element.

### Wishlist Hybrid Pattern (mirrors Cart)
- Same architecture as the cart: localStorage for guests, Supabase sync on login, merge on auth change.
- `toggleWishlist(id)` → optimistic UI update (toggle heart class) → save to localStorage → fire-and-forget Supabase sync.
- `handleWishlistAuth(userId)` → fetch server wishlist → union with local → push local-only items to server → update all visible hearts.
- Heart state synced across pages: same product's heart on store card and PDP both update via `updateAllHearts()` querying `[data-product-id]`.

### Like Counts with Public RLS
- To show aggregate counts (e.g., how many users liked a product) without exposing user data, add a public SELECT policy (`USING (true)`) on the table. Then query all rows and count client-side, or use Supabase's count feature.
- Optimistic updates: increment/decrement the local count object immediately on toggle, then sync to server. If the server write fails, the count is off by 1 until next page load — acceptable tradeoff for instant UI feedback.
- Pattern: `likeCounts[id] = (likeCounts[id] || 0) + 1` on like, `Math.max((likeCounts[id] || 0) - 1, 0)` on unlike.

### CSS Scroll Snap for Product Grids
- `scroll-snap-type: y proximity` on the scroll container (not `mandatory` — mandatory forces one-row-at-a-time scrolling which feels slow).
- `scroll-snap-align: start` on each product row.
- `scroll-margin-top` must account for fixed headers — different values for desktop vs mobile via media query.
- Proximity allows fast scrolling to skip rows while still snapping when scroll velocity is low.

### Sticky Mobile Action Bars
- `position: fixed; bottom: 0; left: 0; right: 0` with `z-index` above content but below modals/drawers.
- Use `@media (max-width: 600px)` to show only on mobile — desktop doesn't need it.
- Add `padding-bottom` to page content equal to bar height so content isn't hidden behind it.
- `backdrop-filter: blur()` for glassmorphism effect matching the site aesthetic.

### Stock Badge Calculation
- Calculate total stock by summing all sizes: `sizes.reduce((sum, s) => sum + (s.stock || 0), 0)`.
- Show badge only when actionable: LOW STOCK (≤10, amber) creates urgency, SOLD OUT (=0) prevents wasted clicks.
- Desaturate entire card when sold out via `filter: grayscale()` — visual signal without needing to read text.

### SECURITY DEFINER vs Session GUCs in PostgreSQL
- `current_setting('role')` is a session-level GUC — it does NOT change inside `SECURITY DEFINER` functions. It will still say `'authenticated'` even when the function runs as its owner.
- `current_user` DOES change inside `SECURITY DEFINER` to the function owner.
- Use `current_user` (not `current_setting('role')`) when you need to distinguish "is this being called by RLS/trigger internals vs. a direct user call" inside SECURITY DEFINER.

### Multi-Tab Auth: Stale Session Handling
- `signOut({ scope: 'local' })` clears tokens in the current browser tab only, without invalidating the server session. Use before `signInWithPassword()` to clear stale state.
- `signOut()` without scope invalidates the server session, breaking all other tabs.
- Guard repair/migration functions with null checks (e.g., `.is('username', null)`) so they never overwrite existing good data.

### Typography Audit Discipline
- **Token drift is real**: Even with a well-defined type ramp, individual CSS rules silently accumulate hardcoded `font-size`/`font-weight` values. Grep for bare `font-size:` and `font-weight:` outside `:root` periodically — every one should reference a `var(--text-*)` token.
- **Min font size = 0.7rem (11.2px)**: Anything below risks WCAG AA failure. Cart badges, stat labels, and status bars are common offenders.
- **Dark mode contrast trap**: Text colors that look fine in Figma often fail WCAG AA when rendered on actual dark backgrounds. `#666` on `#0a0a0f` = ~2.8:1 (fail). `#999` on `#0a0a0f` = ~6:1 (pass). Always verify computed contrast ratios.
- **Font loading budget**: Only load the weights you actually use. Check CSS for `font-weight` values, map them to loaded weights, and trim the Google Fonts URL. Three unused weights = ~40KB wasted on every page load.