// Profile page — displays user profile, avatar upload, stats, achievements, and order history
import { getCurrentUser, signOut } from '../auth/auth.js';
import { supabase } from '../config/supabase.js';
import { initializeTheme } from './theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer } from './cart.js';

// ── Level / XP system ──
// ₦10,000 spent = 1 XP. Levels use quadratic thresholds.
const LEVEL_THRESHOLDS = [0, 2, 6, 12, 20, 32, 48, 70, 100, 140, 190];

function calculateLevel(totalSpent) {
    const xp = Math.floor(totalSpent / 10000);
    let level = 1;
    let xpForNext = LEVEL_THRESHOLDS[1] || 5;
    let xpForCurrent = 0;

    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i + 1;
            xpForCurrent = LEVEL_THRESHOLDS[i];
            xpForNext = LEVEL_THRESHOLDS[i + 1] || LEVEL_THRESHOLDS[i] + 100;
        } else {
            break;
        }
    }

    const xpInLevel = xp - xpForCurrent;
    const xpNeeded = xpForNext - xpForCurrent;
    const percent = Math.min((xpInLevel / xpNeeded) * 100, 100);

    return { level, xp, xpForNext, percent };
}

// ── Rank badge based on level ──
// Metallic progression: grey → bronze → silver → gold → diamond → legendary
const RANK_DATA = [
    { name: 'NEWBIE',          color: '#8a8a8a' },  // LVL 1 — grey
    { name: 'FIT_ROOKIE',      color: '#8a8a8a' },  // LVL 2 — grey
    { name: 'STREET_STYLER',   color: '#cd7f32' },  // LVL 3 — bronze
    { name: 'NEON_DRIPPER',    color: '#cd7f32' },  // LVL 4 — bronze
    { name: 'FIT_COMMANDER',   color: '#b0b0b0' },  // LVL 5 — silver
    { name: 'CYBER_SWAGLORD',  color: '#b0b0b0' },  // LVL 6 — silver
    { name: 'DRIP_ARCHITECT',  color: '#ffd700' },  // LVL 7 — gold
    { name: 'OUTFIT_WARLORD',  color: '#ffd700' },  // LVL 8 — gold
    { name: 'FITBOSS_2099',    color: '#b9f2ff' },  // LVL 9 — diamond
    { name: 'GODOFDRIP.EXE',   color: '#ff44cc' },  // LVL 10+ — legendary
];

function getRank(level) {
    return RANK_DATA[Math.min(level, 10) - 1] || RANK_DATA[0];
}

// ── Achievement definitions ──
const ACHIEVEMENTS = [
    {
        id: 'first-drop',
        name: 'First Drop',
        desc: 'Place your first order',
        icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        check: (orders) => orders.length >= 1,
        progress: (orders) => ({ current: orders.length, target: 1 })
    },
    {
        id: 'big-spender',
        name: 'Big Spender',
        desc: 'Spend over ₦30k',
        icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="1.5"/>',
        check: (orders) => {
            const total = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            return total > 30000;
        },
        progress: (orders) => {
            const total = Math.round(orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) / 1000);
            return { current: total, target: 30, unit: 'k' };
        }
    },
    {
        id: 'hype-beast',
        name: 'Hype Beast',
        desc: 'Complete 5 orders',
        icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        check: (orders) => orders.length >= 5,
        progress: (orders) => ({ current: orders.length, target: 5 })
    },
    {
        id: 'collector',
        name: 'Collector',
        desc: 'Buy 10 unique items',
        icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        check: (orders) => {
            const products = new Set();
            orders.forEach(o => (o.order_items || []).forEach(i => products.add(i.product_name)));
            return products.size >= 10;
        },
        progress: (orders) => {
            const products = new Set();
            orders.forEach(o => (o.order_items || []).forEach(i => products.add(i.product_name)));
            return { current: products.size, target: 10 };
        }
    },
    {
        id: 'og-member',
        name: 'OG Member',
        desc: '6+ months member',
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        check: (orders, createdAt) => {
            if (!createdAt) return false;
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return new Date(createdAt) <= sixMonthsAgo;
        },
        progress: (orders, createdAt) => {
            if (!createdAt) return { current: 0, target: 6, unit: 'mo' };
            const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
            return { current: Math.min(months, 6), target: 6, unit: 'mo' };
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
                    price
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate total spent
        const totalSpent = (orders || []).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        // Animate stat counters
        const spentEl = document.getElementById('profile-total-spent');
        const countEl = document.getElementById('profile-order-count');
        animateStatCounter(spentEl, Math.round(totalSpent), '₦');
        animateStatCounter(countEl, (orders || []).length);

        // Update level/XP
        updateLevelXP(totalSpent);

        // Render orders or empty state
        if (!orders || orders.length === 0) {
            renderEmptyOrders();
        } else {
            renderOrders(orders);
        }

        return orders || [];
    } catch (e) {
        console.warn('Failed to load orders:', e);
        renderEmptyOrders();
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
        const total = (isNaN(totalVal) ? 0 : Math.round(totalVal)).toLocaleString('en-US');
        const items = order.order_items || [];
        const firstName = items.length > 0 ? escapeHtml(items[0].product_name || 'Item') : 'Order';
        const extra = items.length > 1 ? ` +${items.length - 1} more` : '';
        const status = escapeHtml(order.status || 'completed').toUpperCase();
        const orderId = `ORD-${String(order.id).slice(-4).padStart(4, '0')}`;

        const itemsHtml = items.map(item => `
            <div class="profile-order-item">
                ${item.product_image ? `<img src="${escapeHtml(item.product_image)}" alt="${escapeHtml(item.product_name || 'Item')}" class="profile-order-item-img" loading="lazy">` : `<div class="profile-order-item-img profile-order-item-placeholder"></div>`}
                <div class="profile-order-item-info">
                    <span class="profile-order-item-name">${escapeHtml(item.product_name || 'Item')}</span>
                    <span class="profile-order-item-meta">${item.size ? `Size: ${escapeHtml(item.size)}` : ''}${item.size && item.quantity ? ' · ' : ''}${item.quantity ? `Qty: ${item.quantity}` : ''}</span>
                </div>
                <span class="profile-order-item-price">₦${Math.round(parseFloat(item.price || 0)).toLocaleString('en-US')}</span>
            </div>
        `).join('');

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
                    <span class="profile-order-status">${status}</span>
                    <span class="profile-order-row-price">₦${escapeHtml(total)}</span>
                    <svg class="profile-order-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
                ${items.length > 0 ? `<div class="profile-order-items" aria-hidden="true">${itemsHtml}</div>` : ''}
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
            <a href="store.html" class="profile-empty-cta">Start your collection</a>
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
        return `
            <div class="profile-achievement ${stateClass}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
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

        // Validate file type
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.type)) {
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

            // Upload new avatar
            const ext = file.name.split('.').pop().toLowerCase();
            const filePath = `${userId}/${Date.now()}.${ext}`;

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

            window.location.href = 'store.html';
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

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await initializeCart();
    setupCartDrawer();

    const user = await getCurrentUser();

    // Auth guard: redirect if not logged in
    if (!user) return showError();

    // Render profile
    loadProfile(user);
    setupAvatarUpload(user.id);
    setupLogout();
    setupOrderExpansion();

    // Load async data (orders + member since)
    const [orders, createdAt] = await Promise.all([
        loadOrders(user.id),
        loadMemberSince()
    ]);

    // Render achievements based on real data
    renderAchievements(orders, createdAt);

    // Show content with entrance animation
    showContent();
});
