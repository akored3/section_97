// Leaderboard page — displays top spenders ranked by total spend
import { supabase } from '../config/supabase.js';
import { initializeTheme } from './theme.js';
import { initializeCart, setupCartDrawer, handleAuthChange } from './cart.js';
import { getCurrentUser, signOut } from '../auth/auth.js';
import { calculateLevel, getRank } from '../data/ranks.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeMenu } from './menu.js';

const userSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="20" r="12"/><path d="M8 58C8 44 18 36 32 36C46 36 56 44 56 58" stroke-linecap="round"/></svg>`;

// ── Abbreviate currency amounts ──
function abbreviateAmount(amount) {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
    return String(amount);
}

// ── Animated counter ──
function animateCounter(el, target, prefix = '', suffix = '', duration = 1200) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = `${prefix}${target.toLocaleString('en-US')}${suffix}`;
        return;
    }
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${prefix}${Math.floor(eased * target).toLocaleString('en-US')}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = `${prefix}${target.toLocaleString('en-US')}${suffix}`;
    };
    requestAnimationFrame(step);
}

// ── Glitch effect ──
function startGlitch() {
    const el = document.querySelector('.lb-glitch');
    if (!el) return;
    const loop = () => {
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 120);
        setTimeout(loop, 5000 + Math.random() * 3000);
    };
    loop();
}

// ── Render podium (top 1–3) ──
function renderPodium(top3) {
    const podium = document.getElementById('lb-podium');
    if (top3.length === 0) {
        podium.innerHTML = '';
        return;
    }

    const maxOrders = Math.max(...top3.map(u => u.order_count || 0), 1);
    // Display order: #2, #1, #3 (only include positions that exist)
    let displayOrder, rankNums, rankLabels;
    if (top3.length === 1) {
        displayOrder = [top3[0]];
        rankNums = [1];
        rankLabels = ['I'];
    } else if (top3.length === 2) {
        displayOrder = [top3[1], top3[0]];
        rankNums = [2, 1];
        rankLabels = ['II', 'I'];
    } else {
        displayOrder = [top3[1], top3[0], top3[2]];
        rankNums = [2, 1, 3];
        rankLabels = ['II', 'I', 'III'];
    }

    podium.innerHTML = displayOrder.map((user, i) => {
        const rank = rankNums[i];
        const { level } = calculateLevel(user.total_spent || 0);
        const rankData = getRank(level);
        const pct = ((user.order_count || 0) / maxOrders * 100).toFixed(1);
        const spent = abbreviateAmount(Math.round(user.total_spent || 0));
        const pulseColor = rank === 1 ? 'rgba(255,215,0,0.3)' :
                          rank === 2 ? 'rgba(255,0,255,0.25)' : 'rgba(0,212,255,0.25)';

        const avatarContent = user.avatar_url
            ? `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.username)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="lb-avatar-fallback" style="display:none">${userSvg}</div>`
            : userSvg;

        return `
            <div class="lb-podium-card" data-rank="${rank}" style="--lb-pulse-color: ${pulseColor}">
                <div class="lb-scanlines"></div>
                <div class="lb-cb lb-cb--tl"></div><div class="lb-cb lb-cb--tr"></div>
                <div class="lb-cb lb-cb--bl"></div><div class="lb-cb lb-cb--br"></div>
                <div class="lb-shine-sweep"></div>
                <div class="lb-podium-top">
                    <div class="lb-rank-badge"><span>${rankLabels[i]}</span></div>
                    <div>
                        <div class="lb-podium-rank-label">RANK #${rank}</div>
                        <div class="lb-podium-username">${escapeHtml(user.username || 'Unknown')}</div>
                    </div>
                </div>
                <div class="lb-avatar-hex">
                    <div class="lb-avatar-hex-inner">${avatarContent}</div>
                </div>
                <div class="lb-podium-stats">
                    <div class="lb-podium-stat-row">
                        <span class="lb-podium-stat-label">ORDERS</span>
                        <span class="lb-podium-orders">${user.order_count || 0}</span>
                    </div>
                    <div class="lb-progress-bar">
                        <div class="lb-progress-fill" data-width="${pct}%"></div>
                    </div>
                    <div class="lb-podium-stat-row">
                        <span class="lb-podium-stat-label muted">TOTAL SPENT</span>
                        <span class="lb-podium-spent">₦${spent}</span>
                    </div>
                    <div class="lb-podium-stat-row">
                        <span class="lb-podium-stat-label muted">LEVEL</span>
                        <span class="lb-podium-spent">LVL ${level}</span>
                    </div>
                    <div class="lb-status-badge">${escapeHtml(rankData.name)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Animate progress bars
    setTimeout(() => {
        podium.querySelectorAll('.lb-progress-fill[data-width]').forEach(el => {
            el.style.width = el.dataset.width;
        });
    }, 600);
}

// ── Render table rows ──
function renderTable(users, currentUserId, startPos = 4) {
    const body = document.getElementById('lb-table-body');
    if (users.length === 0) {
        body.innerHTML = '';
        return;
    }

    const maxOrders = Math.max(...users.map(u => u.order_count || 0), 1);

    body.innerHTML = users.map((user, i) => {
        const pos = i + startPos;
        const { level } = calculateLevel(user.total_spent || 0);
        const rankData = getRank(level);
        const pct = ((user.order_count || 0) / maxOrders * 100).toFixed(1);
        const spent = abbreviateAmount(Math.round(user.total_spent || 0));
        const isYou = currentUserId && user.id === currentUserId;

        const avatarContent = user.avatar_url
            ? `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.username)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="lb-avatar-fallback" style="display:none">${userSvg}</div>`
            : userSvg;

        return `
            <div class="lb-row ${isYou ? 'lb-row--you' : ''}" style="animation-delay: ${i * 0.06 + 0.6}s">
                <span class="lb-rank-num">${String(pos).padStart(2, '0')}</span>
                <div class="lb-user">
                    <div class="lb-avatar-small">${avatarContent}</div>
                    <div>
                        <div class="lb-name">${escapeHtml(user.username || 'Unknown')}${isYou ? ' (YOU)' : ''}</div>
                    </div>
                </div>
                <div class="lb-orders-cell">
                    <span class="lb-orders-num">${user.order_count || 0}</span>
                    <div class="lb-bar">
                        <div class="lb-bar-fill" data-width="${pct}%"></div>
                    </div>
                </div>
                <span class="lb-spent">₦${spent}</span>
                <div class="lb-badge" style="color: ${rankData.color}; border-color: ${rankData.color}33">${escapeHtml(rankData.name)}</div>
            </div>
        `;
    }).join('');

    // Animate bar fills
    setTimeout(() => {
        body.querySelectorAll('.lb-bar-fill[data-width]').forEach(el => {
            el.style.width = el.dataset.width;
        });
    }, 800);
}

// ── Render "Your Rank" section ──
function renderYourRank(allUsers, currentUser) {
    const section = document.getElementById('lb-your-rank');
    if (!currentUser) return;

    const idx = allUsers.findIndex(u => u.id === currentUser.id);
    const pos = idx >= 0 ? idx + 1 : null;

    // Find current user's profile data
    const userData = idx >= 0 ? allUsers[idx] : null;
    const totalSpent = userData?.total_spent || currentUser.totalSpent || 0;
    const orderCount = userData?.order_count || currentUser.orderCount || 0;
    const { level } = calculateLevel(totalSpent);
    const rankData = getRank(level);

    section.classList.remove('hidden');
    document.getElementById('lb-your-pos').textContent = pos ? `#${pos}` : 'UNRANKED';
    document.getElementById('lb-your-name').textContent = currentUser.username || 'Unknown';
    document.getElementById('lb-your-stats').textContent =
        `${orderCount} orders · ₦${abbreviateAmount(Math.round(totalSpent))} spent · LVL ${level}`;

    const badge = document.getElementById('lb-your-badge');
    badge.textContent = rankData.name;
    badge.style.color = rankData.color;
    badge.style.borderColor = rankData.color;
}

// ── Auth UI (nav bar) ──
function setupAuthUI(user) {
    const authText = document.getElementById('auth-text');
    const authBtn = document.getElementById('auth-btn');
    const dropdown = document.getElementById('auth-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileUserInfo = document.getElementById('mobile-user-info');
    const mobileUsername = document.getElementById('mobile-username');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if (user) {
        if (authText) authText.textContent = user.username || 'Account';
        if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
        if (mobileUserInfo) mobileUserInfo.classList.remove('hidden');
        if (mobileUsername) mobileUsername.textContent = user.username || 'Account';
        if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
    }

    // Desktop dropdown toggle
    if (authBtn && dropdown) {
        authBtn.addEventListener('click', () => {
            if (user) dropdown.classList.toggle('active');
            else window.location.href = 'auth.html';
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.auth-wrapper')) dropdown.classList.remove('active');
        });
    }

    // Logout handlers
    const doLogout = async () => {
        const result = await signOut();
        if (result.success) window.location.href = 'store.html';
    };
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', doLogout);
}

// ── Main init ──
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await initializeCart();
    setupCartDrawer();
    initializeMenu();

    const currentUser = await getCurrentUser();
    setupAuthUI(currentUser);
    if (currentUser) {
        await handleAuthChange(currentUser.id);
    }

    try {
        // Fetch all profiles ordered by total_spent
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, total_spent, order_count')
            .order('total_spent', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Filter out users with no activity
        const active = (profiles || []).filter(p => (p.total_spent || 0) > 0 || (p.order_count || 0) > 0);

        // Hide skeleton, show content
        document.getElementById('lb-skeleton').classList.add('hidden');
        document.getElementById('lb-content').classList.remove('hidden');

        if (active.length === 0) {
            // Empty state
            document.getElementById('lb-podium').innerHTML = `
                <div class="lb-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <p>NO SPENDERS YET</p>
                    <span>Be the first to make a purchase and claim the #1 spot</span>
                </div>
            `;
            document.querySelector('.lb-table-wrapper').classList.add('hidden');
        } else {
            // Stats
            const totalOps = active.length;
            const totalOrders = active.reduce((s, p) => s + (p.order_count || 0), 0);
            const totalVolume = active.reduce((s, p) => s + (p.total_spent || 0), 0);

            animateCounter(document.getElementById('lb-total-operators'), totalOps);
            animateCounter(document.getElementById('lb-total-orders'), totalOrders);
            // Redact volume — show magnitude via comma structure with block characters
            const redacted = Math.round(totalVolume).toLocaleString('en-US').replace(/\d/g, '■');
            document.getElementById('lb-total-volume').textContent = `₦${redacted}`;

            // Render podium (top users)
            const top3 = active.slice(0, 3);
            renderPodium(top3);

            // Render table (remaining positions)
            const rest = active.slice(3);
            renderTable(rest, currentUser?.id, 4);

            // Your rank
            if (currentUser) {
                renderYourRank(active, currentUser);
            }
        }

        // Sync timestamp
        const now = new Date();
        const ts = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} // ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} UTC`;
        document.getElementById('lb-sync-time').textContent = `LAST SYNC: ${ts}`;

        // Start glitch
        startGlitch();

    } catch (err) {
        console.error('Leaderboard load failed:', err);
        document.getElementById('lb-skeleton').classList.add('hidden');
        document.getElementById('lb-content').classList.remove('hidden');
        document.getElementById('lb-podium').innerHTML = `
            <div class="lb-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p>FAILED TO LOAD</p>
                <span>Check your connection and try again</span>
            </div>
        `;
        document.querySelector('.lb-table-wrapper').classList.add('hidden');
    }
});
