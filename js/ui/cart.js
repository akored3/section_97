// Shopping cart — Supabase sync with localStorage fallback, optimistic UI
import { supabase } from '../config/supabase.js';
import { escapeHtml, productSizesMap } from '../components/productRenderer.js';

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

let lastBadgeCount = -1;

function updateBadge(skipPulse = false) {
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    // Skip if badge already shows the correct count
    if (count === lastBadgeCount) return;
    lastBadgeCount = count;

    document.querySelectorAll('#cart-badge').forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.classList.remove('pulse');
        if (count > 0 && !skipPulse) {
            void badge.offsetWidth;
            badge.classList.add('pulse');
        }
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
                <p>Nothing here yet</p>
            </div>`;
        if (footer) footer.classList.add('hidden');
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-drawer-item" data-key="${escapeHtml(item.cartKey)}" style="animation-delay:${i * 50}ms">
            <img class="cart-drawer-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
                 onerror="this.style.display='none'">
            <div class="cart-drawer-item-details">
                <div class="cart-drawer-item-name">${escapeHtml(item.name)}</div>
                ${item.size ? `<div class="cart-drawer-item-size">Size ${escapeHtml(item.size)}</div>` : ''}
                <div class="cart-drawer-item-price">₦${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="cart-drawer-item-actions">
                    <div class="cart-drawer-qty">
                        <button data-action="dec" data-key="${escapeHtml(item.cartKey)}" aria-label="Decrease quantity">−</button>
                        <span>${item.quantity}</span>
                        <button data-action="inc" data-key="${escapeHtml(item.cartKey)}" aria-label="Increase quantity"
                            ${item.maxStock && item.quantity >= item.maxStock ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="cart-drawer-remove" data-action="remove" data-key="${escapeHtml(item.cartKey)}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (footer) footer.classList.remove('hidden');
    if (totalEl) totalEl.textContent = `₦${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    if (priceEl) priceEl.textContent = `₦${(item.price * qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalEl = document.getElementById('cart-drawer-total');
    if (totalEl) totalEl.textContent = `₦${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return true;
}

// ─── Stock Limit Feedback ────────────────────────

function showStockToast(item) {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;

    // Remove any existing toast
    drawer.querySelector('.cart-stock-toast')?.remove();

    const sizeLabel = item.size ? ` in size ${item.size}` : '';
    const toast = document.createElement('div');
    toast.className = 'cart-stock-toast';
    toast.textContent = `Only ${item.maxStock} available${sizeLabel}`;
    drawer.appendChild(toast);

    // Shake the + button
    const el = document.querySelector(`.cart-drawer-item[data-key="${CSS.escape(item.cartKey)}"]`);
    const incBtn = el?.querySelector('[data-action="inc"]');
    if (incBtn) {
        incBtn.classList.add('shake');
        incBtn.addEventListener('animationend', () => incBtn.classList.remove('shake'), { once: true });
    }

    setTimeout(() => toast.remove(), 2500);
}

// Disable/enable the + button based on stock limit
function updateIncButton(key, qty, maxStock) {
    const el = document.querySelector(`.cart-drawer-item[data-key="${CSS.escape(key)}"]`);
    const incBtn = el?.querySelector('[data-action="inc"]');
    if (incBtn) {
        incBtn.disabled = maxStock ? qty >= maxStock : false;
    }
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
        // Update maxStock if a fresh value was passed
        if (product.stock != null) existing.maxStock = product.stock;

        // Block if at stock limit
        if (existing.maxStock && existing.quantity >= existing.maxStock) {
            showStockToast(existing);
            return;
        }

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
            maxStock: product.stock || null,
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

    // Block if exceeding stock limit
    if (item.maxStock && qty > item.maxStock) {
        showStockToast(item);
        return;
    }

    item.quantity = qty;
    saveLocal();
    updateBadge();

    // In-place DOM update (no re-animation flicker)
    if (!updateItemInPlace(key, qty)) renderDrawer();
    updateIncButton(key, qty, item.maxStock);

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

        const items = (data || []).map(row => ({
            id: String(row.product_id),
            name: row.products?.name || 'Unknown',
            price: parseFloat(row.products?.price || 0),
            image: row.products?.image_front || '',
            size: row.size || null,
            quantity: row.quantity,
            cartKey: makeKey(row.product_id, row.size)
        }));

        // Fetch stock limits separately (non-blocking, won't break cart if it fails)
        attachStockLimits(items);

        return items;
    } catch (e) {
        console.warn('Failed to load cart from Supabase:', e);
        return null;
    }
}

// Attach maxStock to cart items from product_sizes (fire-and-forget)
async function attachStockLimits(items) {
    try {
        const productIds = [...new Set(items.map(i => parseInt(i.id)))];
        if (productIds.length === 0) return;

        const { data } = await supabase
            .from('product_sizes')
            .select('product_id, size, stock')
            .in('product_id', productIds);

        if (!data) return;

        for (const item of items) {
            const match = data.find(s => s.product_id === parseInt(item.id) && s.size === item.size);
            if (match) item.maxStock = match.stock;
        }
        saveLocal(); // persist maxStock to localStorage
    } catch (e) {
        console.warn('Failed to fetch stock limits:', e);
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
        const localCart = [...cart]; // snapshot before overwrite

        if (hasGuestActivity && localCart.length > 0) {
            // Guest added items this session, then logged in — merge
            const merged = [...serverCart];
            for (const guest of localCart) {
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
                if (cart.length > 0) {
                    await supabase.from('cart_items').insert(
                        cart.map(item => ({
                            user_id: userId,
                            product_id: parseInt(item.id),
                            size: item.size || null,
                            quantity: item.quantity
                        }))
                    );
                }
            } catch (e) {
                console.warn('Failed to sync merged cart:', e);
            }
        } else if (serverCart.length === 0 && localCart.length > 0) {
            // Server empty but local has items — sync failed earlier, re-push
            cart = localCart;
            try {
                await supabase.from('cart_items').insert(
                    localCart.map(item => ({
                        user_id: userId,
                        product_id: parseInt(item.id),
                        size: item.size || null,
                        quantity: item.quantity
                    }))
                );
            } catch (e) {
                console.warn('Failed to re-sync local cart:', e);
            }
        } else {
            // Normal: server is source of truth
            cart = serverCart;
        }

        saveLocal();
        updateBadge(true);
    } else {
        // Logout: clear cart (items belong to the account, not the browser)
        currentUserId = null;
        useSupabase = false;
        hasGuestActivity = false;
        cart = [];
        saveLocal();
        updateBadge();
        renderDrawer();
    }
}

// ─── Store Page: Add-to-Cart Buttons ─────────────

// Close any open size picker
function closeAllPickers() {
    document.querySelectorAll('.card-size-picker.open').forEach(picker => {
        picker.classList.remove('open');
        const card = picker.closest('.product-card');
        const img = card?.querySelector('.product-image');
        if (img) img.classList.remove('picker-blur');
        const btn = card?.querySelector('.add-to-cart-btn');
        if (btn) btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> Add to bag`;
    });
}

// Close picker when clicking outside any card
document.addEventListener('click', (e) => {
    if (!e.target.closest('.product-card')) closeAllPickers();
});

export function setupAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            const sizes = productSizesMap.get(btn.dataset.id) || [];

            // No sizes or single "ONE SIZE" → add directly
            if (sizes.length === 0) {
                addToCart({ id: btn.dataset.id, name: btn.dataset.name, price: btn.dataset.price, image: btn.dataset.image, size: null });
                showAddedFeedback(btn);
                return;
            }
            if (sizes.length === 1 && sizes[0].stock > 0) {
                addToCart({ id: btn.dataset.id, name: btn.dataset.name, price: btn.dataset.price, image: btn.dataset.image, size: sizes[0].size, stock: sizes[0].stock });
                showAddedFeedback(btn);
                return;
            }

            const card = btn.closest('.product-card');
            const imageContainer = card.querySelector('.product-image');
            let picker = imageContainer.querySelector('.card-size-picker');

            // Toggle picker if already open
            if (picker && picker.classList.contains('open')) {
                closeAllPickers();
                return;
            }

            // Close any other open pickers first
            closeAllPickers();

            // Create picker if it doesn't exist yet
            if (!picker) {
                picker = document.createElement('div');
                picker.className = 'card-size-picker';
                picker.innerHTML = `
                    <span class="card-size-label">SELECT SIZE</span>
                    <div class="card-size-chips">
                        ${sizes.map(s => `<button type="button" class="card-size-chip ${s.stock <= 0 ? 'out-of-stock' : ''}"
                            data-size="${escapeHtml(s.size)}" ${s.stock <= 0 ? 'disabled' : ''}>${escapeHtml(s.size)}</button>`).join('')}
                    </div>`;
                imageContainer.appendChild(picker);

                // Size chip click handler
                picker.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const chip = ev.target.closest('.card-size-chip:not([disabled])');
                    if (!chip) return;

                    const sizeData = sizes.find(s => s.size === chip.dataset.size);
                    addToCart({
                        id: btn.dataset.id,
                        name: btn.dataset.name,
                        price: btn.dataset.price,
                        image: btn.dataset.image,
                        size: chip.dataset.size,
                        stock: sizeData?.stock || null
                    });

                    closeAllPickers();
                    showAddedFeedback(btn);
                });
            }

            // Open the picker + blur the image
            picker.classList.add('open');
            imageContainer.classList.add('picker-blur');
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Close`;
        });
    });
}

function showAddedFeedback(btn) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg> Added!`;
    btn.classList.add('added-flash');
    setTimeout(() => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> Add to bag`;
        btn.classList.remove('added-flash');
    }, 1200);
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

    // Checkout button → navigate to checkout page
    document.querySelector('.cart-drawer-checkout')?.addEventListener('click', () => {
        window.location.href = 'checkout.html';
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
    // Don't update badge here — handleAuthChange() will set the correct
    // count after Supabase sync. For guests, updateBadgeIfGuest() runs below.
}

// Show badge for guest users only (no Supabase sync will follow)
export function updateBadgeIfGuest() {
    if (!currentUserId) updateBadge(true);
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

export async function clearCartFull() {
    if (currentUserId && useSupabase) {
        try {
            await supabase.from('cart_items').delete().eq('user_id', currentUserId);
        } catch (e) {
            console.warn('Failed to clear Supabase cart:', e);
        }
    }
    clearCart();
}
