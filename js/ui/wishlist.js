// Wishlist — Supabase sync with localStorage fallback (mirrors cart pattern)
import { supabase } from '../config/supabase.js';
import { formatPrice } from '../config/currency.js';

// ─── State ───────────────────────────────────────
let wishlist = []; // array of product ID strings
let currentUserId = null;
let useSupabase = false;
let likeCounts = {}; // { productId: count }

const STORAGE_KEY = 'section97-wishlist';

// ─── Helpers ─────────────────────────────────────

function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist)); }
    catch (e) { /* storage full or unavailable */ }
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

// ─── Badge ───────────────────────────────────────

function updateBadge() {
    const count = wishlist.length;
    document.querySelectorAll('.wishlist-badge').forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });
}

// ─── Like Counts ────────────────────────────────

export async function fetchLikeCounts() {
    try {
        const { data, error } = await supabase
            .from('wishlists')
            .select('product_id');

        if (error) throw error;

        // Count occurrences of each product_id
        likeCounts = {};
        (data || []).forEach(row => {
            const id = String(row.product_id);
            likeCounts[id] = (likeCounts[id] || 0) + 1;
        });

        updateAllLikeCounts();
    } catch (e) {
        console.warn('Failed to fetch like counts:', e);
    }
}

export function getLikeCount(productId) {
    return likeCounts[String(productId)] || 0;
}

function updateAllLikeCounts() {
    document.querySelectorAll('.wishlist-heart').forEach(btn => {
        const id = btn.dataset.productId;
        const countEl = btn.querySelector('.like-count');
        const count = likeCounts[id] || 0;
        if (countEl) {
            countEl.textContent = count;
            countEl.style.display = count > 0 ? '' : 'none';
        }
    });
}

// ─── Heart State ─────────────────────────────────

export function isWishlisted(productId) {
    return wishlist.includes(String(productId));
}

function updateAllHearts(productId, active) {
    document.querySelectorAll(`.wishlist-heart[data-product-id="${productId}"]`).forEach(btn => {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
    });
}

// ─── Toggle ──────────────────────────────────────

export async function toggleWishlist(productId) {
    const id = String(productId);
    const alreadyWishlisted = wishlist.includes(id);

    if (alreadyWishlisted) {
        // Remove
        wishlist = wishlist.filter(wid => wid !== id);
        updateAllHearts(id, false);
    } else {
        // Add
        wishlist.push(id);
        updateAllHearts(id, true);
    }

    // Optimistic like count update
    if (alreadyWishlisted) {
        likeCounts[id] = Math.max((likeCounts[id] || 0) - 1, 0);
    } else {
        likeCounts[id] = (likeCounts[id] || 0) + 1;
    }
    updateAllLikeCounts();

    saveLocal();
    updateBadge();

    // Sync to Supabase (fire-and-forget)
    if (useSupabase && currentUserId) {
        try {
            if (alreadyWishlisted) {
                await supabase
                    .from('wishlists')
                    .delete()
                    .eq('user_id', currentUserId)
                    .eq('product_id', parseInt(id));
            } else {
                await supabase
                    .from('wishlists')
                    .insert({ user_id: currentUserId, product_id: parseInt(id) });
            }
        } catch (e) {
            console.warn('Wishlist sync failed:', e);
        }
    }
}

// ─── Init ────────────────────────────────────────

export async function initializeWishlist() {
    wishlist = loadLocal();
    updateBadge();
}

// ─── Auth Change (sync with Supabase) ────────────

export async function handleWishlistAuth(userId) {
    if (!userId) {
        currentUserId = null;
        useSupabase = false;
        return;
    }

    currentUserId = userId;
    useSupabase = true;

    try {
        // Fetch server wishlist
        const { data, error } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', userId);

        if (error) throw error;

        const serverIds = (data || []).map(w => String(w.product_id));
        const localIds = loadLocal();

        // Merge: union of local + server (no duplicates)
        const merged = [...new Set([...serverIds, ...localIds])];

        // Push any local-only items to server
        const localOnly = localIds.filter(id => !serverIds.includes(id));
        if (localOnly.length > 0) {
            const rows = localOnly.map(id => ({ user_id: userId, product_id: parseInt(id) }));
            await supabase.from('wishlists').insert(rows).select();
        }

        wishlist = merged;
        saveLocal();
        updateBadge();

        // Update all visible hearts
        document.querySelectorAll('.wishlist-heart').forEach(btn => {
            const pid = btn.dataset.productId;
            const active = wishlist.includes(pid);
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active);
        });
    } catch (e) {
        console.warn('Wishlist sync failed:', e);
    }
}

// ─── Get Wishlist IDs ────────────────────────────

export function getWishlist() {
    return [...wishlist];
}

// ─── Drawer ─────────────────────────────────────

let productsCache = [];

export function setProductsCache(products) {
    productsCache = products;
}

function renderWishlistDrawer() {
    const container = document.getElementById('wishlist-drawer-items');
    if (!container) return;

    if (wishlist.length === 0) {
        container.innerHTML = `
            <div class="wishlist-drawer-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p>Your wishlist is empty</p>
                <span>Tap the heart on any product to save it here</span>
            </div>`;
        return;
    }

    const items = wishlist.map(id => {
        const product = productsCache.find(p => String(p.id) === id);
        if (!product) return '';
        return `
            <div class="wishlist-drawer-item" data-product-id="${product.id}">
                <img class="wishlist-drawer-item-img" src="${product.imageSrc}" alt="${product.name}"
                     onerror="this.onerror=null;this.src='images/placeholder.png';">
                <div class="wishlist-drawer-item-details">
                    <span class="wishlist-drawer-item-name">${product.name}</span>
                    <span class="wishlist-drawer-item-price">${formatPrice(product.price)}</span>
                </div>
                <div class="wishlist-drawer-item-actions">
                    <a href="product.html?id=${product.id}" class="wishlist-drawer-view" aria-label="View product">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </a>
                    <button class="wishlist-drawer-remove" data-product-id="${product.id}" aria-label="Remove from wishlist">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = items;

    // Remove button handlers
    container.querySelectorAll('.wishlist-drawer-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleWishlist(btn.dataset.productId);
            renderWishlistDrawer();
        });
    });
}

export function openWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    const overlay = document.getElementById('wishlist-overlay');
    if (!drawer || !overlay) return;

    renderWishlistDrawer();
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    const overlay = document.getElementById('wishlist-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

export function setupWishlistDrawer() {
    const closeBtn = document.getElementById('wishlist-drawer-close');
    const overlay = document.getElementById('wishlist-overlay');
    const navBtn = document.getElementById('wishlist-nav-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeWishlistDrawer);
    if (overlay) overlay.addEventListener('click', closeWishlistDrawer);
    if (navBtn) navBtn.addEventListener('click', openWishlistDrawer);
}
