// Shopping cart — Supabase sync with localStorage fallback, optimistic UI
import { supabase } from '../config/supabase.js';
import { escapeHtml } from '../components/productRenderer.js';

// ─── State ───────────────────────────────────────
let cart = [];
let currentUserId = null;
let useSupabase = false;
let hasGuestActivity = false; // true only if items were added while logged out (this session)

const STORAGE_KEY = 'section97-cart';

// ─── Helpers ─────────────────────────────────────

// Composite key for size-aware dedup: "42-M" or "7-none"
function makeKey(id, size) {
    return `${id}-${size || 'none'}`;
}

function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
    catch (e) { /* storage full or unavailable */ }
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

// Supabase null-safe size filter
function withSize(query, size) {
    return size ? query.eq('size', size) : query.is('size', null);
}

// ─── Badge ───────────────────────────────────────

function updateBadge() {
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    document.querySelectorAll('#cart-badge').forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.classList.remove('pulse');
        void badge.offsetWidth;
        if (count > 0) badge.classList.add('pulse');
    });
}

// ─── Drawer Render ───────────────────────────────

function renderDrawer() {
    const container = document.getElementById('cart-drawer-items');
    const footer = document.getElementById('cart-drawer-footer');
    const totalEl = document.getElementById('cart-drawer-total');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-drawer-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <p>Your cart is empty</p>
            </div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-drawer-item" data-key="${escapeHtml(item.cartKey)}" style="animation-delay:${i * 50}ms">
            <img class="cart-drawer-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
                 onerror="this.style.display='none'">
            <div class="cart-drawer-item-details">
                <div class="cart-drawer-item-name">${escapeHtml(item.name)}</div>
                ${item.size ? `<div class="cart-drawer-item-size">Size ${escapeHtml(item.size)}</div>` : ''}
                <div class="cart-drawer-item-price">$${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div class="cart-drawer-item-actions">
                    <div class="cart-drawer-qty">
                        <button data-action="dec" data-key="${escapeHtml(item.cartKey)}">−</button>
                        <span>${item.quantity}</span>
                        <button data-action="inc" data-key="${escapeHtml(item.cartKey)}">+</button>
                    </div>
                    <button class="cart-drawer-remove" data-action="remove" data-key="${escapeHtml(item.cartKey)}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (footer) footer.style.display = '';
    if (totalEl) totalEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// In-place update for quantity changes (avoids re-rendering + re-animating all items)
function updateItemInPlace(key, qty) {
    const el = document.querySelector(`.cart-drawer-item[data-key="${CSS.escape(key)}"]`);
    if (!el) return false;

    const item = cart.find(i => i.cartKey === key);
    if (!item) return false;

    const qtySpan = el.querySelector('.cart-drawer-qty span');
    if (qtySpan) qtySpan.textContent = qty;

    const priceEl = el.querySelector('.cart-drawer-item-price');
    if (priceEl) priceEl.textContent = `$${(item.price * qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalEl = document.getElementById('cart-drawer-total');
    if (totalEl) totalEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return true;
}

// ─── Drawer Open / Close ─────────────────────────

export function openCartDrawer() {
    renderDrawer();
    document.getElementById('cart-drawer')?.classList.add('active');
    document.getElementById('cart-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeCartDrawer() {
    document.getElementById('cart-drawer')?.classList.remove('active');
    document.getElementById('cart-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ─── Cart Operations ─────────────────────────────

export function addToCart(product) {
    const key = makeKey(product.id, product.size);
    const existing = cart.find(i => i.cartKey === key);

    if (existing) {
        existing.quantity += 1;
        saveLocal();
        updateBadge();
        if (!updateItemInPlace(key, existing.quantity)) renderDrawer();
    } else {
        cart.push({
            id: String(product.id),
            name: product.name,
            price: parseFloat(product.price),
            image: product.image,
            size: product.size || null,
            quantity: 1,
            cartKey: key
        });
        saveLocal();
        updateBadge();
        renderDrawer();
    }

    // Track guest activity for merge-on-login
    if (!currentUserId) hasGuestActivity = true;

    // Supabase background sync
    if (currentUserId && useSupabase) {
        const item = cart.find(i => i.cartKey === key);
        syncUpsert(item);
    }
}

export function removeFromCart(key) {
    const item = cart.find(i => i.cartKey === key);
    if (!item) return;

    const el = document.querySelector(`.cart-drawer-item[data-key="${CSS.escape(key)}"]`);
    let removed = false;

    const doRemove = () => {
        if (removed) return;
        removed = true;
        cart = cart.filter(i => i.cartKey !== key);
        saveLocal();
        updateBadge();
        renderDrawer();
    };

    if (el) {
        el.classList.add('removing');
        el.addEventListener('animationend', doRemove, { once: true });
        setTimeout(doRemove, 350); // fallback
    } else {
        doRemove();
    }

    // Supabase background sync
    if (currentUserId && useSupabase) syncDelete(item);
}

export function updateQuantity(key, qty) {
    if (qty < 1) return removeFromCart(key);

    const item = cart.find(i => i.cartKey === key);
    if (!item) return;

    item.quantity = qty;
    saveLocal();
    updateBadge();

    // In-place DOM update (no re-animation flicker)
    if (!updateItemInPlace(key, qty)) renderDrawer();

    if (currentUserId && useSupabase) syncUpdate(item);
}

// ─── Supabase Sync (fire-and-forget) ─────────────

async function syncUpsert(item) {
    try {
        let q = supabase.from('cart_items')
            .select('id, quantity')
            .eq('user_id', currentUserId)
            .eq('product_id', parseInt(item.id));
        q = withSize(q, item.size);
        const { data } = await q.maybeSingle();

        if (data) {
            await supabase.from('cart_items')
                .update({ quantity: item.quantity })
                .eq('id', data.id);
        } else {
            await supabase.from('cart_items').insert({
                user_id: currentUserId,
                product_id: parseInt(item.id),
                size: item.size || null,
                quantity: item.quantity
            });
        }
    } catch (e) {
        console.warn('Cart sync (upsert) failed:', e);
    }
}

async function syncDelete(item) {
    try {
        let q = supabase.from('cart_items')
            .delete()
            .eq('user_id', currentUserId)
            .eq('product_id', parseInt(item.id));
        await withSize(q, item.size);
    } catch (e) {
        console.warn('Cart sync (delete) failed:', e);
    }
}

async function syncUpdate(item) {
    try {
        let q = supabase.from('cart_items')
            .update({ quantity: item.quantity })
            .eq('user_id', currentUserId)
            .eq('product_id', parseInt(item.id));
        await withSize(q, item.size);
    } catch (e) {
        console.warn('Cart sync (update) failed:', e);
    }
}

// Load full cart from Supabase (joined with products table)
async function loadFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('cart_items')
            .select('product_id, size, quantity, products (name, price, image_front)')
            .eq('user_id', currentUserId);

        if (error) throw error;

        return (data || []).map(row => ({
            id: String(row.product_id),
            name: row.products?.name || 'Unknown',
            price: parseFloat(row.products?.price || 0),
            image: row.products?.image_front || '',
            size: row.size || null,
            quantity: row.quantity,
            cartKey: makeKey(row.product_id, row.size)
        }));
    } catch (e) {
        console.warn('Failed to load cart from Supabase:', e);
        return null;
    }
}

// ─── Auth State Handling ─────────────────────────

export async function handleAuthChange(userId) {
    if (userId) {
        // Skip if already loaded for this user
        if (currentUserId === userId) return;

        currentUserId = userId;
        useSupabase = true;

        const serverCart = await loadFromSupabase() || [];

        if (hasGuestActivity && cart.length > 0) {
            // Guest added items this session, then logged in — merge
            const guestCart = [...cart];
            const merged = [...serverCart];
            for (const guest of guestCart) {
                const match = merged.find(m => m.cartKey === guest.cartKey);
                if (match) {
                    match.quantity += guest.quantity;
                } else {
                    merged.push(guest);
                }
            }

            cart = merged;
            hasGuestActivity = false;

            // Push merged state to Supabase (replace all)
            try {
                await supabase.from('cart_items').delete().eq('user_id', userId);
                await supabase.from('cart_items').insert(
                    cart.map(item => ({
                        user_id: userId,
                        product_id: parseInt(item.id),
                        size: item.size || null,
                        quantity: item.quantity
                    }))
                );
            } catch (e) {
                console.warn('Failed to sync merged cart:', e);
            }
        } else {
            // Normal page load: server is source of truth
            cart = serverCart;
        }

        saveLocal();
        updateBadge();
    } else {
        // Logout: keep local cart, stop syncing
        currentUserId = null;
        useSupabase = false;
        hasGuestActivity = false;
        updateBadge();
    }
}

// ─── Store Page: Add-to-Cart Buttons ─────────────

export function setupAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart({
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: btn.dataset.price,
                image: btn.dataset.image,
                size: null
            });
        });
    });
}

// ─── Setup Cart Drawer ───────────────────────────

export function setupCartDrawer() {
    // Close button
    document.getElementById('cart-drawer-close')?.addEventListener('click', closeCartDrawer);

    // Overlay click to close
    document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer);

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCartDrawer();
    });

    // Cart buttons open drawer
    document.querySelectorAll('.cart-btn, .pdp-cart-btn, #pdp-cart-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCartDrawer();
        });
    });

    // Event delegation for drawer item actions (qty +/-, remove)
    document.getElementById('cart-drawer-items')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const key = btn.dataset.key;
        const action = btn.dataset.action;
        const item = cart.find(i => i.cartKey === key);
        if (!item) return;

        if (action === 'inc') updateQuantity(key, item.quantity + 1);
        else if (action === 'dec') updateQuantity(key, item.quantity - 1);
        else if (action === 'remove') removeFromCart(key);
    });
}

// ─── Initialize ──────────────────────────────────

export async function initializeCart() {
    cart = loadLocal();
    updateBadge();
}

// ─── Public Getters ──────────────────────────────

export function getCart() { return cart; }
export function getCartCount() { return cart.reduce((s, i) => s + i.quantity, 0); }
export function getCartTotal() { return cart.reduce((s, i) => s + i.price * i.quantity, 0); }

export function clearCart() {
    cart = [];
    saveLocal();
    updateBadge();
    renderDrawer();
}
