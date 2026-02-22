// Profile page — displays user profile, avatar upload, stats, achievements, and order history
import { getCurrentUser, signOut } from '../auth/auth.js';
import { supabase } from '../config/supabase.js';
import { initializeTheme } from './theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer } from './cart.js';

// ── Level / XP system ──
// ₦10,000 spent = 1 XP. Levels use quadratic thresholds.
const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 75, 110, 150, 200, 260, 330];

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
function getRank(level) {
    if (level >= 10) return 'LEGEND';
    if (level >= 7) return 'ELITE_OPS';
    if (level >= 5) return 'STREET_ELITE';
    if (level >= 3) return 'HYPE_HUNTER';
    return 'ROOKIE';
}

// ── Achievement definitions ──
const ACHIEVEMENTS = [
    {
        id: 'first-drop',
        name: 'First Drop',
        icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        check: (orders) => orders.length >= 1
    },
    {
        id: 'big-spender',
        name: 'Big Spender',
        icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="1.5"/>',
        check: (orders) => {
            const total = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            return total > 30000;
        }
    },
    {
        id: 'hype-beast',
        name: 'Hype Beast',
        icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        check: (orders) => orders.length >= 5
    },
    {
        id: 'collector',
        name: 'Collector',
        icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        check: (orders) => {
            const products = new Set();
            orders.forEach(o => (o.order_items || []).forEach(i => products.add(i.product_name)));
            return products.size >= 10;
        }
    },
    {
        id: 'og-member',
        name: 'OG Member',
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        check: (orders, createdAt) => {
            if (!createdAt) return false;
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return new Date(createdAt) <= sixMonthsAgo;
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

    avatarEl.src = user.avatar || generateDefaultAvatar(user.username);
    avatarEl.alt = `${escapeHtml(user.username || 'User')}'s avatar`;
    avatarEl.onerror = () => {
        avatarEl.onerror = null;
        avatarEl.src = generateDefaultAvatar(user.username);
    };

    usernameEl.textContent = user.username || 'Unknown';
    emailEl.textContent = user.email || '';

    document.title = `${user.username || 'Profile'} | SECTION-97`;
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

// Update level / XP display
function updateLevelXP(totalSpent) {
    const { level, xp, xpForNext, percent } = calculateLevel(totalSpent);

    document.getElementById('profile-level').textContent = `LVL ${level}`;
    document.getElementById('profile-xp-text').textContent = `${xp}/${xpForNext} XP`;
    document.getElementById('profile-rank-badge').textContent = getRank(level);

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

// Render order rows (new horizontal format with status badges)
function renderOrders(orders) {
    const container = document.getElementById('profile-orders-list');
    container.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const total = parseFloat(order.total || 0).toLocaleString('en-US', {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        });
        const items = order.order_items || [];
        const firstName = items.length > 0 ? escapeHtml(items[0].product_name) : 'Order';
        const extra = items.length > 1 ? ` +${items.length - 1} more` : '';
        const status = escapeHtml(order.status || 'completed').toUpperCase();
        const orderId = `ORD-${String(order.id).slice(-4).padStart(4, '0')}`;

        return `
            <div class="profile-order-row">
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

// Render achievements
function renderAchievements(orders, createdAt) {
    const container = document.getElementById('profile-achievements');
    container.innerHTML = ACHIEVEMENTS.map(ach => {
        const unlocked = ach.check(orders, createdAt);
        const stateClass = unlocked ? 'unlocked' : 'locked';
        return `
            <div class="profile-achievement ${stateClass}">
                <div class="profile-achievement-hex">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        ${ach.icon}
                    </svg>
                </div>
                <span class="profile-achievement-name">${escapeHtml(ach.name)}</span>
            </div>
        `;
    }).join('');
}

// Tab switching
function initTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-tab-panel').forEach(p => p.classList.remove('active'));

            // Activate clicked tab
            tab.classList.add('active');
            const panel = document.getElementById(`profile-tab-${tab.dataset.tab}`);
            if (panel) panel.classList.add('active');
        });
    });
}

// Setup avatar upload
function setupAvatarUpload(userId) {
    const input = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('profile-avatar');
    const wrapper = document.getElementById('profile-avatar-wrapper');

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
    initTabs();

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
