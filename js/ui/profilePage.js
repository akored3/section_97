// Profile page — displays user profile, avatar upload, stats, achievements, and order history
import { getCurrentUser, signOut } from '../auth/auth.js';
import { supabase } from '../config/supabase.js';
import { initializeTheme } from './theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { formatPrice, initializeCurrency } from '../config/currency.js';
import { initializeCart, setupCartDrawer, handleAuthChange } from './cart.js';
import { initializeWishlist, handleWishlistAuth, getWishlist, toggleWishlist } from './wishlist.js';
import { initPageLoader } from './progressBar.js';
import { calculateLevel, getRank } from '../data/ranks.js';
import { fetchProducts } from '../data/products.js';

// ── Achievement definitions ──
const ACHIEVEMENTS = [
    {
        id: 'first-drop',
        name: 'First Drop',
        desc: 'Place your first order',
        icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        color: '#4a9eff',  // blue
        check: (orders) => orders.length >= 1,
        progress: (orders) => ({ current: orders.length, target: 1 })
    },
    {
        id: 'big-spender',
        name: 'Big Spender',
        desc: 'Spend over ₦300k',
        color: '#ffd700',  // gold
        icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="1.5"/>',
        check: (orders) => {
            const total = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            return total > 300000;
        },
        progress: (orders) => {
            const total = Math.round(orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) / 1000);
            return { current: total, target: 300, unit: 'k' };
        }
    },
    {
        id: 'hype-beast',
        name: 'Hype Beast',
        desc: 'Complete 15 orders',
        icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        color: '#a78bfa',  // purple
        check: (orders) => orders.length >= 15,
        progress: (orders) => ({ current: orders.length, target: 15 })
    },
    {
        id: 'collector',
        name: 'Collector',
        desc: 'Buy 5+ items worth ₦25k+',
        color: '#00ffd5',  // cyan
        icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        check: (orders) => {
            let count = 0;
            orders.forEach(o => (o.order_items || []).forEach(i => {
                if (parseFloat(i.product_price || 0) >= 25000) count++;
            }));
            return count >= 5;
        },
        progress: (orders) => {
            let count = 0;
            orders.forEach(o => (o.order_items || []).forEach(i => {
                if (parseFloat(i.product_price || 0) >= 25000) count++;
            }));
            return { current: count, target: 5 };
        }
    },
    {
        id: 'og-member',
        name: 'OG Member',
        desc: '1 year member',
        color: '#ff6b35',  // flame
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        check: (orders, createdAt) => {
            if (!createdAt) return false;
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return new Date(createdAt) <= oneYearAgo;
        },
        progress: (orders, createdAt) => {
            if (!createdAt) return { current: 0, target: 12, unit: 'mo' };
            const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
            return { current: Math.min(months, 12), target: 12, unit: 'mo' };
        }
    }
];

// Generate a default avatar SVG with the user's initial
function generateDefaultAvatar(username) {
    const initial = (username || '?')[0].toUpperCase();
    return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="50" fill="#1a1a1a"/>
            <text x="50" y="56" text-anchor="middle" dominant-baseline="middle"
                  font-family="sans-serif" font-size="42" font-weight="700" fill="#00ff00">
                ${initial}
            </text>
        </svg>`
    )}`;
}

// Show error state (not logged in)
function showError() {
    document.getElementById('profile-skeleton').classList.add('hidden');
    document.getElementById('profile-content').classList.add('hidden');
    const error = document.getElementById('profile-error');
    error.classList.remove('hidden');
    error.style.display = 'flex';
}

// Show profile content with entrance animation
function showContent() {
    document.getElementById('profile-skeleton').classList.add('hidden');
    const content = document.getElementById('profile-content');
    content.classList.remove('hidden');
    content.classList.add('profile-enter');
}

// Populate profile header: avatar, username, email
function loadProfile(user) {
    const avatarEl = document.getElementById('profile-avatar');
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');

    const username = user?.username || 'Unknown';
    const email = user?.email || '';
    const avatar = user?.avatar || null;

    avatarEl.src = avatar || generateDefaultAvatar(username);
    avatarEl.alt = `${escapeHtml(username)}'s avatar`;
    avatarEl.onerror = () => {
        avatarEl.onerror = null;
        avatarEl.src = generateDefaultAvatar(username);
    };

    usernameEl.textContent = username;
    emailEl.textContent = email;

    document.title = `${username} | SECTION-97`;
}

// Load member since date from Supabase auth
async function loadMemberSince() {
    try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.created_at) {
            const date = new Date(authUser.created_at);
            document.getElementById('profile-member-since').textContent =
                date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            return authUser.created_at;
        }
    } catch (e) {
        console.warn('Failed to load member since:', e);
    }
    return null;
}

// Update level / XP display with rank color
function updateLevelXP(totalSpent) {
    const { level, xp, xpForNext, percent } = calculateLevel(totalSpent);
    const rank = getRank(level);

    document.getElementById('profile-level').textContent = `LVL ${level}`;
    document.getElementById('profile-xp-text').textContent = `${xp}/${xpForNext} XP`;

    const badge = document.getElementById('profile-rank-badge');
    badge.textContent = rank.name;
    badge.style.setProperty('--rank-color', rank.color);

    // Animate XP bar fill after a short delay
    requestAnimationFrame(() => {
        document.getElementById('profile-xp-fill').style.width = `${percent}%`;
    });
}

// Animate stat counters (count-up effect)
function animateStatCounter(el, targetValue, prefix = '', suffix = '', duration = 1200) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        el.textContent = `${prefix}${targetValue.toLocaleString('en-US')}${suffix}`;
        return;
    }

    const start = performance.now();
    const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * targetValue);
        el.textContent = `${prefix}${current.toLocaleString('en-US')}${suffix}`;
        if (progress < 1) requestAnimationFrame(animate);
        else el.textContent = `${prefix}${targetValue.toLocaleString('en-US')}${suffix}`;
    };
    requestAnimationFrame(animate);
}

// Fetch and render orders, update stats
async function loadOrders(userId) {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                total,
                status,
                created_at,
                order_items (
                    id,
                    product_name,
                    product_image,
                    size,
                    quantity,
                    product_price
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Render orders or empty state
        if (!orders || orders.length === 0) {
            renderEmptyOrders();
        } else {
            renderOrders(orders);
        }

        return orders || [];
    } catch (e) {
        console.warn('Failed to load orders:', e);
        renderOrderError();
        return [];
    }
}

// Render order rows with expandable item details
function renderOrders(orders) {
    const container = document.getElementById('profile-orders-list');
    container.innerHTML = orders.filter(order => order && order.id).map(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const totalVal = parseFloat(order.total || 0);
        const total = formatPrice(isNaN(totalVal) ? 0 : totalVal);
        const items = order.order_items || [];
        const firstName = items.length > 0 ? escapeHtml(items[0].product_name || 'Item') : 'Order';
        const extra = items.length > 1 ? ` +${items.length - 1} more` : '';
        const statusRaw = order.status || 'completed';
        const status = escapeHtml(statusRaw).toUpperCase();
        const orderId = `ORD-${String(order.id).slice(-4).padStart(4, '0')}`;

        const itemsHtml = items.map(item => `
            <div class="profile-order-item">
                ${item.product_image ? `<img src="${escapeHtml(item.product_image)}" alt="${escapeHtml(item.product_name || 'Item')}" class="profile-order-item-img" loading="lazy">` : `<div class="profile-order-item-img profile-order-item-placeholder"></div>`}
                <div class="profile-order-item-info">
                    <span class="profile-order-item-name">${escapeHtml(item.product_name || 'Item')}</span>
                    <span class="profile-order-item-meta">${item.size ? `Size: ${escapeHtml(item.size)}` : ''}${item.size && item.quantity ? ' · ' : ''}${item.quantity ? `Qty: ${item.quantity}` : ''}</span>
                </div>
                <span class="profile-order-item-price">${formatPrice(parseFloat(item.product_price || 0))}</span>
            </div>
        `).join('');

        // Status tracker pipeline
        const PIPELINE = ['pending', 'processing', 'shipped', 'delivered'];
        const PIPELINE_LABELS = ['Ordered', 'Processing', 'Shipped', 'Delivered'];
        const PIPELINE_ICONS = [
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        ];
        const isCancelled = statusRaw === 'cancelled';
        const pipelineIdx = PIPELINE.indexOf(statusRaw);
        // completed = fully done, treat like delivered for pipeline display
        const effectiveIdx = statusRaw === 'completed' ? 3 : pipelineIdx;

        const trackerHtml = isCancelled
            ? `<div class="order-tracker">
                <div class="order-tracker-cancelled">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    ORDER CANCELLED
                </div>
               </div>`
            : `<div class="order-tracker">
                ${PIPELINE.map((step, i) => {
                    const done = i < effectiveIdx;
                    const current = i === effectiveIdx;
                    const cls = done ? 'done' : current ? 'current' : '';
                    return `
                        ${i > 0 ? `<div class="order-tracker-line ${done || current ? 'done' : ''}"></div>` : ''}
                        <div class="order-tracker-step ${cls}">
                            <div class="order-tracker-dot ${cls}">${PIPELINE_ICONS[i]}</div>
                            <span class="order-tracker-label">${PIPELINE_LABELS[i]}</span>
                        </div>`;
                }).join('')}
               </div>`;

        return `
            <div class="profile-order-row">
                <div class="profile-order-row-header">
                    <div class="profile-order-row-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                        </svg>
                    </div>
                    <div class="profile-order-row-details">
                        <div class="profile-order-row-name">${firstName}${extra}</div>
                        <div class="profile-order-row-meta">${escapeHtml(orderId)} · ${escapeHtml(date)}</div>
                    </div>
                    <span class="profile-order-status" data-status="${escapeHtml(statusRaw)}">${status}</span>
                    <span class="profile-order-row-price">${total}</span>
                    <svg class="profile-order-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
                <div class="profile-order-items" aria-hidden="true">
                    ${trackerHtml}
                    ${itemsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Render empty orders state
function renderEmptyOrders() {
    const container = document.getElementById('profile-orders-list');
    container.innerHTML = `
        <div class="profile-orders-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <p>COLLECTION EMPTY</p>
            <span class="profile-empty-sub">Your drip history will appear here</span>
            <br>
            <a href="index.html" class="profile-empty-cta">Start your collection</a>
        </div>
    `;
}

// Render order fetch error state (distinct from empty)
function renderOrderError() {
    const container = document.getElementById('profile-orders-list');
    container.innerHTML = `
        <div class="profile-orders-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>COULDN'T LOAD ORDERS</p>
            <span class="profile-empty-sub">Check your connection and try refreshing</span>
        </div>
    `;
}

// Render achievements with progress indicators
function renderAchievements(orders, createdAt) {
    const container = document.getElementById('profile-achievements');
    container.innerHTML = ACHIEVEMENTS.map(ach => {
        const unlocked = ach.check(orders, createdAt);
        const stateClass = unlocked ? 'unlocked' : 'locked';
        const prog = ach.progress(orders, createdAt);
        const unit = prog.unit || '';
        const progressText = unlocked
            ? 'UNLOCKED'
            : `${prog.current}${unit}/${prog.target}${unit}`;
        const label = unlocked ? `${ach.name} — Unlocked` : `${ach.name} — ${ach.desc} (${progressText})`;
        const progressPercent = Math.min((prog.current / prog.target) * 100, 100);
        const colorStyle = unlocked && ach.color ? `style="--ach-color: ${ach.color}"` : '';
        return `
            <div class="profile-achievement ${stateClass}" ${colorStyle} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
                <div class="profile-achievement-hex">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        ${ach.icon}
                    </svg>
                </div>
                <span class="profile-achievement-name">${escapeHtml(ach.name)}</span>
                <span class="profile-achievement-progress ${unlocked ? 'complete' : ''}">${progressText}</span>
                ${!unlocked ? `<div class="profile-achievement-bar"><div class="profile-achievement-bar-fill" style="width:${progressPercent}%"></div></div>` : ''}
            </div>
        `;
    }).join('');
}

// Setup achievements dropdown toggle
function setupAchievementsDropdown() {
    const btn = document.getElementById('achievements-toggle');
    const content = document.getElementById('profile-achievements');
    if (!btn || !content) return;

    btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', !expanded);
        content.setAttribute('aria-hidden', expanded);
        content.classList.toggle('achievements-collapsed', expanded);
        content.classList.toggle('achievements-expanded', !expanded);
    });
}

// Setup orders dropdown toggle
function setupOrdersDropdown() {
    const btn = document.getElementById('orders-toggle');
    const content = document.getElementById('profile-orders-list');
    if (!btn || !content) return;

    btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', !expanded);
        content.setAttribute('aria-hidden', expanded);
        content.classList.toggle('orders-collapsed', expanded);
        content.classList.toggle('orders-expanded', !expanded);
    });
}

// Setup order row expansion (click to see items)
function setupOrderExpansion() {
    const container = document.getElementById('profile-orders-list');
    container.addEventListener('click', (e) => {
        const row = e.target.closest('.profile-order-row');
        if (!row) return;
        const details = row.querySelector('.profile-order-items');
        if (!details) return;
        const isOpen = row.classList.toggle('expanded');
        details.setAttribute('aria-hidden', !isOpen);
    });
}

// Setup avatar upload
let isAvatarUploading = false;
function setupAvatarUpload(userId) {
    const input = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('profile-avatar');
    const wrapper = document.getElementById('profile-avatar-wrapper');

    // Allow keyboard activation on the label
    const uploadLabel = wrapper.querySelector('.profile-avatar-upload');
    if (uploadLabel) {
        uploadLabel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
        });
    }

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || isAvatarUploading) return;

        // Clear any previous error
        const oldError = wrapper.querySelector('.profile-avatar-error');
        if (oldError) oldError.remove();

        // Validate file type and derive safe extension from MIME
        const MIME_TO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        const safeExt = MIME_TO_EXT[file.type];
        if (!safeExt) {
            showAvatarError(wrapper, 'Use JPG, PNG, or WebP');
            input.value = '';
            return;
        }

        // Validate file size (2MB max)
        const MAX_SIZE = 2 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            showAvatarError(wrapper, 'Max file size is 2MB');
            input.value = '';
            return;
        }

        // Lock concurrent uploads
        isAvatarUploading = true;

        // Show uploading state
        avatarImg.classList.add('uploading');
        wrapper.classList.add('uploading');

        try {
            // Delete old avatar files
            const { data: existingFiles } = await supabase.storage
                .from('avatars')
                .list(userId);

            if (existingFiles && existingFiles.length > 0) {
                const oldPaths = existingFiles.map(f => `${userId}/${f.name}`);
                await supabase.storage.from('avatars').remove(oldPaths);
            }

            // Upload new avatar (extension from validated MIME type, not filename)
            const filePath = `${userId}/${Date.now()}.${safeExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile in database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Update the image
            avatarImg.src = publicUrl;
        } catch (err) {
            console.error('Avatar upload failed:', err);
            showAvatarError(wrapper, 'Upload failed — try again');
        } finally {
            isAvatarUploading = false;
            avatarImg.classList.remove('uploading');
            wrapper.classList.remove('uploading');
            input.value = '';
        }
    });
}

// Show a brief error message below the avatar
function showAvatarError(wrapper, message) {
    const oldError = wrapper.querySelector('.profile-avatar-error');
    if (oldError) oldError.remove();

    const errorEl = document.createElement('span');
    errorEl.className = 'profile-avatar-error';
    errorEl.textContent = message;
    wrapper.appendChild(errorEl);

    setTimeout(() => errorEl.remove(), 3000);
}

// Setup logout button
function setupLogout() {
    const btn = document.getElementById('profile-logout-btn');
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'LOGGING OUT...';

        const result = await signOut();
        if (result.success) {
            try {
                localStorage.removeItem('section97-username');
            } catch (e) { /* storage unavailable */ }

            window.location.href = 'index.html';
        } else {
            btn.disabled = false;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                LOGOUT
            `;
        }
    });
}

// ── Wishlist section ──

let allProducts = [];

async function loadWishlistProducts() {
    if (allProducts.length === 0) {
        try { allProducts = await fetchProducts(); } catch (e) { allProducts = []; }
    }
    return allProducts;
}

function renderWishlist() {
    const container = document.getElementById('profile-wishlist-list');
    if (!container) return;

    const ids = getWishlist();
    if (ids.length === 0) {
        container.innerHTML = `
            <div class="profile-orders-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p>WISHLIST EMPTY</p>
                <span class="profile-empty-sub">Tap the heart on any product to save it here</span>
                <br>
                <a href="index.html" class="profile-empty-cta">Browse products</a>
            </div>`;
        return;
    }

    const items = ids.map(id => {
        const product = allProducts.find(p => String(p.id) === id);
        if (!product) return '';
        return `
            <div class="profile-wishlist-item">
                <img src="${escapeHtml(product.imageSrc)}" alt="${escapeHtml(product.name)}" class="profile-wishlist-item-img" loading="lazy"
                     onerror="this.onerror=null;this.src='images/placeholder.png';">
                <div class="profile-wishlist-item-info">
                    <span class="profile-wishlist-item-name">${escapeHtml(product.name)}</span>
                    <span class="profile-wishlist-item-price">${formatPrice(product.price)}</span>
                </div>
                <div class="profile-wishlist-item-actions">
                    <a href="product.html?id=${product.id}" class="profile-wishlist-view-btn">VIEW</a>
                    <button class="profile-wishlist-remove-btn" data-product-id="${product.id}" aria-label="Remove from wishlist">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).filter(Boolean).join('');

    container.innerHTML = items || `
        <div class="profile-orders-empty">
            <p>WISHLIST EMPTY</p>
            <span class="profile-empty-sub">Products may have been removed</span>
        </div>`;

    // Remove button handlers
    container.querySelectorAll('.profile-wishlist-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleWishlist(btn.dataset.productId);
            renderWishlist();
        });
    });
}

function setupWishlistDropdown() {
    const btn = document.getElementById('wishlist-toggle');
    const content = document.getElementById('profile-wishlist-list');
    if (!btn || !content) return;

    btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', !expanded);
        content.setAttribute('aria-hidden', expanded);
        content.classList.toggle('wishlist-collapsed', expanded);
        content.classList.toggle('wishlist-expanded', !expanded);
        if (!expanded) renderWishlist(); // Re-render on open to stay fresh
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const loader = initPageLoader('profile-skeleton');
    initializeTheme();
    await initializeCurrency();
    await initializeCart();
    setupCartDrawer();
    await initializeWishlist();

    const user = await getCurrentUser();

    // Auth guard: redirect if not logged in
    if (!user) return showError();

    // Sync cart + wishlist with Supabase
    await handleAuthChange(user.id);
    await handleWishlistAuth(user.id);

    // Render profile
    loadProfile(user);
    setupAvatarUpload(user.id);
    setupLogout();
    setupWishlistDropdown();
    setupOrdersDropdown();
    setupOrderExpansion();
    setupAchievementsDropdown();

    // Stats from profile (server-side, kept in sync by DB trigger)
    const totalSpent = user.totalSpent || 0;
    // Animate total spent with currency conversion
    const spentEl = document.getElementById('profile-total-spent');
    if (spentEl) spentEl.textContent = formatPrice(totalSpent);
    animateStatCounter(document.getElementById('profile-order-count'), user.orderCount || 0);
    updateLevelXP(totalSpent);

    // Load async data (orders + member since + products for wishlist)
    const [orders, createdAt] = await Promise.all([
        loadOrders(user.id),
        loadMemberSince(),
        loadWishlistProducts()
    ]);

    // Render achievements based on real data
    renderAchievements(orders, createdAt);

    // Complete progress bar and show content
    if (loader) loader.complete();
    showContent();
});
