// Profile page — displays user profile, avatar upload, stats, and order history
import { getCurrentUser, signOut } from '../auth/auth.js';
import { supabase } from '../config/supabase.js';
import { initializeTheme } from './theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer } from './cart.js';

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
    document.getElementById('profile-skeleton').style.display = 'none';
    document.getElementById('profile-content').style.display = 'none';
    document.getElementById('profile-error').style.display = 'flex';
}

// Show profile content with entrance animation
function showContent() {
    document.getElementById('profile-skeleton').style.display = 'none';
    const content = document.getElementById('profile-content');
    content.style.display = 'flex';
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
        }
    } catch (e) {
        console.warn('Failed to load member since:', e);
    }
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

        // Update stats
        const totalSpent = (orders || []).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        document.getElementById('profile-total-spent').textContent =
            `₦${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('profile-order-count').textContent = (orders || []).length;

        // Render orders or empty state
        if (!orders || orders.length === 0) {
            renderEmptyOrders();
        } else {
            renderOrders(orders);
        }
    } catch (e) {
        console.warn('Failed to load orders:', e);
        // If table doesn't exist yet, show empty state gracefully
        renderEmptyOrders();
    }
}

// Render order cards
function renderOrders(orders) {
    const container = document.getElementById('profile-orders-list');
    container.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const total = parseFloat(order.total || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
        const items = order.order_items || [];

        return `
            <div class="profile-order-card">
                <div class="profile-order-header">
                    <span class="profile-order-date">${escapeHtml(date)}</span>
                    <span class="profile-order-status">${escapeHtml(order.status || 'completed')}</span>
                    <span class="profile-order-total">₦${escapeHtml(total)}</span>
                </div>
                <div class="profile-order-items">
                    ${items.map(item => `
                        <div class="profile-order-item">
                            <img class="profile-order-item-img"
                                 src="${escapeHtml(item.product_image || '')}"
                                 alt="${escapeHtml(item.product_name)}"
                                 onerror="this.style.display='none'">
                            <div class="profile-order-item-details">
                                <div class="profile-order-item-name">${escapeHtml(item.product_name)}</div>
                                <div class="profile-order-item-meta">
                                    ${item.size ? `Size ${escapeHtml(item.size)} · ` : ''}Qty ${item.quantity}
                                </div>
                            </div>
                            <span class="profile-order-item-price">₦${parseFloat(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    `).join('')}
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="56" height="56">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <p class="profile-empty-title">COLLECTION EMPTY</p>
            <span class="profile-empty-sub">Your drip history will appear here</span>
            <br>
            <a href="store.html" class="profile-empty-cta">Start your collection</a>
        </div>
    `;
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
            // Clear cached auth state
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
                Log out
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

    // Load async data (orders + member since)
    await Promise.all([
        loadOrders(user.id),
        loadMemberSince()
    ]);

    // Show content with entrance animation
    showContent();
});
