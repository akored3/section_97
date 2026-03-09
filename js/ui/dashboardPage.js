// Admin dashboard — order management command center
import { supabase } from '../config/supabase.js';
import { getCurrentUser } from '../auth/auth.js';

// ─── State ───────────────────────────────────────
let allOrders = [];
let filteredOrders = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPage = 1;
const PAGE_SIZE = 15;

// ─── Helpers ─────────────────────────────────────
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatPrice(amount) {
    return `₦${Number(amount).toLocaleString()}`;
}

function shortId(uuid) {
    return `ORD-${uuid.slice(0, 6).toUpperCase()}`;
}

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'delivered'];
const STATUS_ICONS = {
    pending: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    processing: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
    shipped: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    delivered: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    cancelled: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

function nextStatus(current) {
    // Legacy 'completed' orders can be moved to 'processing' to enter the pipeline
    if (current === 'completed') return 'processing';
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

// ─── Toast ───────────────────────────────────────
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');
    text.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Theme Toggle ────────────────────────────────
function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    const moon = document.getElementById('moonIcon');
    const sun = document.getElementById('sunIcon');

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            moon.style.display = 'none';
            sun.style.display = 'block';
        } else {
            document.documentElement.removeAttribute('data-theme');
            moon.style.display = 'block';
            sun.style.display = 'none';
        }
    }

    applyTheme(localStorage.getItem('theme') || 'dark');

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        applyTheme(next);
    });
}

// ─── Live Clock ──────────────────────────────────
function startClock() {
    const el = document.getElementById('liveClock');
    const tick = () => {
        const now = new Date();
        el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 1000);
}

// ─── Mobile Sidebar ──────────────────────────────
function setupSidebar() {
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Close on overlay tap
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

// ─── Fetch Orders ────────────────────────────────
async function fetchOrders() {
    // Fetch orders with their items and customer profile
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*),
            profiles:user_id (username, avatar_url)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch orders:', error);
        showToast('FAILED TO LOAD ORDERS', true);
        return [];
    }

    return orders || [];
}

// ─── Overview Stats ──────────────────────────────
function renderOverview(orders) {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'completed').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const revenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

    document.getElementById('ovTotal').textContent = total;
    document.getElementById('ovPending').textContent = pending;
    document.getElementById('ovTransit').textContent = shipped + processing;
    document.getElementById('ovRevenue').textContent = formatPrice(revenue);

    document.getElementById('ovTotalDelta').textContent = `${orders.filter(o => o.status === 'delivered').length} DELIVERED`;
    document.getElementById('ovPendingDelta').textContent = pending > 0 ? 'REQUIRES ACTION' : 'ALL CLEAR';
    document.getElementById('ovTransitDelta').textContent = `${processing} PROCESSING / ${shipped} SHIPPED`;
    document.getElementById('ovRevenueDelta').textContent = 'ALL TIME';

    // Nav badge
    document.getElementById('navOrderCount').textContent = pending;
}

// ─── Filter Counts ───────────────────────────────
function renderFilterCounts(orders) {
    document.getElementById('countAll').textContent = orders.length;
    document.getElementById('countPending').textContent = orders.filter(o => o.status === 'pending' || o.status === 'completed').length;
    document.getElementById('countProcessing').textContent = orders.filter(o => o.status === 'processing').length;
    document.getElementById('countShipped').textContent = orders.filter(o => o.status === 'shipped').length;
    document.getElementById('countDelivered').textContent = orders.filter(o => o.status === 'delivered').length;
}

// ─── Filter + Search ─────────────────────────────
function applyFilters() {
    let result = allOrders;

    // Status filter — pending filter also catches legacy 'completed' orders
    if (currentFilter !== 'all') {
        if (currentFilter === 'pending') {
            result = result.filter(o => o.status === 'pending' || o.status === 'completed');
        } else {
            result = result.filter(o => o.status === currentFilter);
        }
    }

    // Search
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        result = result.filter(o => {
            const name = getCustomerName(o).toLowerCase();
            const email = getCustomerEmail(o).toLowerCase();
            const id = shortId(o.id).toLowerCase();
            const items = (o.order_items || []).map(i => i.product_name.toLowerCase()).join(' ');
            return name.includes(q) || email.includes(q) || id.includes(q) || items.includes(q);
        });
    }

    filteredOrders = result;
    currentPage = 1;
    renderTable();
}

function setupFilters() {
    const bar = document.getElementById('filterBar');
    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        applyFilters();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        applyFilters();
    });
}

// ─── Customer Helpers ────────────────────────────
function getCustomerName(order) {
    if (order.profiles?.username) return order.profiles.username;
    if (order.shipping_name) return order.shipping_name;
    if (order.guest_email) return order.guest_email.split('@')[0];
    return 'Unknown';
}

function getCustomerEmail(order) {
    if (order.guest_email) return order.guest_email;
    return 'Registered user';
}

// ─── Render Table ────────────────────────────────
function renderTable() {
    const body = document.getElementById('ordersBody');
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageOrders = filteredOrders.slice(start, start + PAGE_SIZE);

    if (filteredOrders.length === 0) {
        body.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <p>NO ORDERS FOUND</p>
                </div>
            </td></tr>`;
        document.getElementById('tableMeta').textContent = 'SHOWING 0 RECORDS';
        renderPagination(0, 1);
        return;
    }

    body.innerHTML = pageOrders.map(order => {
        const itemCount = (order.order_items || []).reduce((s, i) => s + i.quantity, 0);
        const customerName = escHtml(getCustomerName(order));
        const customerEmail = escHtml(getCustomerEmail(order));

        return `
            <tr data-order-id="${order.id}">
                <td><span class="td-order-id">${shortId(order.id)}</span></td>
                <td>
                    <div class="td-customer-name">${customerName}</div>
                    <div class="td-customer-email">${customerEmail}</div>
                </td>
                <td><span class="td-items">${itemCount} item${itemCount !== 1 ? 's' : ''}</span></td>
                <td><span class="td-date">${formatDate(order.created_at)}</span></td>
                <td><span class="td-total">${formatPrice(order.total)}</span></td>
                <td>
                    <span class="status-pill status-${order.status}">
                        <span class="s-dot" style="background:currentColor;"></span>
                        ${order.status}
                    </span>
                </td>
                <td>
                    <button class="action-eye" title="View details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('tableMeta').textContent = `SHOWING ${pageOrders.length} OF ${filteredOrders.length} RECORDS`;

    // Row click → open detail
    body.querySelectorAll('tr[data-order-id]').forEach(row => {
        row.addEventListener('click', () => {
            const order = allOrders.find(o => o.id === row.dataset.orderId);
            if (order) openDetail(order);
        });
    });

    renderPagination(filteredOrders.length, totalPages);
}

// ─── Pagination ──────────────────────────────────
function renderPagination(total, totalPages) {
    const info = document.getElementById('paginationInfo');
    const btns = document.getElementById('paginationBtns');

    info.textContent = `PAGE ${currentPage} OF ${totalPages} // ${total} RECORDS`;

    let html = `<button class="pg-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pg-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>`;
    btns.innerHTML = html;

    btns.querySelectorAll('.pg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.page;
            if (p === 'prev' && currentPage > 1) currentPage--;
            else if (p === 'next' && currentPage < totalPages) currentPage++;
            else if (p !== 'prev' && p !== 'next') currentPage = parseInt(p);
            renderTable();
        });
    });
}

// ─── Order Detail Panel ──────────────────────────
function openDetail(order) {
    const overlay = document.getElementById('detailOverlay');
    const panel = document.getElementById('detailPanel');
    const title = document.getElementById('detailTitle');
    const sub = document.getElementById('detailSub');
    const body = document.getElementById('detailBody');

    title.textContent = `ORDER ${shortId(order.id)}`;
    sub.textContent = `CMD.VIEW // ${formatDate(order.created_at)}`;

    const items = order.order_items || [];
    const subtotal = items.reduce((s, i) => s + (Number(i.product_price || i.price) * i.quantity), 0);
    const next = nextStatus(order.status);
    const isFinal = order.status === 'delivered' || order.status === 'cancelled';

    // Pipeline — 'completed' legacy orders show as fully done (payment verified, needs processing)
    const pipelineHtml = STATUS_FLOW.map((step, i) => {
        const isCompleted = order.status === 'completed';
        const stepIdx = isCompleted ? -1 : STATUS_FLOW.indexOf(order.status);
        const isDone = isCompleted ? false : i < stepIdx;
        const isCurrent = isCompleted ? false : i === stepIdx;
        const nodeClass = isDone ? 'done' : isCurrent ? 'current' : '';
        const labelClass = isDone ? 'done' : isCurrent ? 'current' : '';

        let html = `
            <div class="pipeline-step">
                <div class="pipeline-node ${nodeClass}">${STATUS_ICONS[step]}</div>
                <div class="pipeline-label ${labelClass}">${step}</div>
            </div>`;

        if (i < STATUS_FLOW.length - 1) {
            html += `<div class="pipeline-line ${isDone ? 'done' : ''}"></div>`;
        }
        return html;
    }).join('');

    // Status actions
    let actionsHtml = '';
    if (!isFinal) {
        if (next) {
            actionsHtml += `
                <button class="status-action-btn advance-btn" data-order-id="${order.id}" data-status="${next}">
                    <span class="btn-shine"></span>
                    ${STATUS_ICONS[next]} ADVANCE TO ${next.toUpperCase()}
                </button>`;
        }
        actionsHtml += `
            <button class="status-action-btn cancel-btn" data-order-id="${order.id}" data-status="cancelled">
                <span class="btn-shine"></span>
                ${STATUS_ICONS.cancelled} CANCEL ORDER
            </button>`;
    }

    // Items list
    const itemsHtml = items.map(item => `
        <div class="detail-item">
            <div class="di-thumb">
                ${item.product_image ? `<img src="${escHtml(item.product_image)}" alt="${escHtml(item.product_name)}" onerror="this.style.display='none'">` : ''}
            </div>
            <div class="di-info">
                <div class="di-name">${escHtml(item.product_name)}</div>
                <div class="di-meta">SIZE: ${escHtml(item.size || 'N/A')} // QTY: ${item.quantity}</div>
            </div>
            <div class="di-price">${formatPrice(Number(item.product_price || item.price) * item.quantity)}</div>
        </div>
    `).join('');

    body.innerHTML = `
        <div class="pipeline">${pipelineHtml}</div>

        ${actionsHtml ? `<div class="status-actions">${actionsHtml}</div>` : ''}

        <div class="detail-section cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>CUSTOMER INFO</div>
            <div class="info-row">
                <span class="info-label">NAME</span>
                <span class="info-value">${escHtml(getCustomerName(order))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">EMAIL</span>
                <span class="info-value">${escHtml(getCustomerEmail(order))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">TYPE</span>
                <span class="info-value">${order.user_id ? 'Registered' : 'Guest'}</span>
            </div>
            ${order.shipping_phone ? `
            <div class="info-row">
                <span class="info-label">PHONE</span>
                <span class="info-value">${escHtml(order.shipping_phone)}</span>
            </div>` : ''}
        </div>

        <div class="detail-section cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>SHIPPING</div>
            <div class="info-row">
                <span class="info-label">ADDRESS</span>
                <span class="info-value">${escHtml(order.shipping_address || 'N/A')}</span>
            </div>
            ${order.shipping_city ? `
            <div class="info-row">
                <span class="info-label">CITY</span>
                <span class="info-value">${escHtml(order.shipping_city)}</span>
            </div>` : ''}
        </div>

        <div class="detail-section cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>ORDER ITEMS</div>
            ${itemsHtml}
        </div>

        <div class="detail-section detail-totals cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>PAYMENT</div>
            <div class="info-row">
                <span class="info-label">REFERENCE</span>
                <span class="info-value mono">${escHtml(order.payment_reference || 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ITEMS SUBTOTAL</span>
                <span class="info-value">${formatPrice(subtotal)}</span>
            </div>
            <div class="info-row total-row">
                <span class="info-label">TOTAL</span>
                <span class="total-val">${formatPrice(order.total)}</span>
            </div>
        </div>
    `;

    // Status action buttons
    body.querySelectorAll('.status-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const orderId = btn.dataset.orderId;
            const newStatus = btn.dataset.status;

            const label = newStatus === 'cancelled' ? 'Cancel this order?' : `Advance to ${newStatus}?`;
            if (!confirm(label)) return;

            btn.disabled = true;
            btn.style.opacity = '0.5';

            try {
                const { error } = await supabase.rpc('admin_update_order_status', {
                    p_order_id: orderId,
                    p_new_status: newStatus
                });

                if (error) throw error;

                showToast(`STATUS UPDATED → ${newStatus.toUpperCase()}`);

                // Refresh data
                allOrders = await fetchOrders();
                renderOverview(allOrders);
                renderFilterCounts(allOrders);
                applyFilters();

                // Refresh detail panel with updated order
                const updated = allOrders.find(o => o.id === orderId);
                if (updated) openDetail(updated);
                else closeDetail();

            } catch (err) {
                console.error('Status update failed:', err);
                showToast(`FAILED: ${err.message}`, true);
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    });

    overlay.classList.add('open');
    panel.classList.add('open');
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
    document.getElementById('detailPanel').classList.remove('open');
}

function setupDetailPanel() {
    document.getElementById('detailOverlay').addEventListener('click', closeDetail);
    document.getElementById('closeDetailBtn').addEventListener('click', closeDetail);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetail();
    });
}

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    setupTheme();
    startClock();
    setupSidebar();
    setupDetailPanel();

    const skeleton = document.getElementById('dashSkeleton');
    const authGate = document.getElementById('authGate');
    const layout = document.getElementById('dashLayout');

    // 1. Check auth
    const user = await getCurrentUser();
    console.log('[DASH] Current user:', user);
    if (!user) {
        console.log('[DASH] No user found — redirecting');
        skeleton.classList.add('hidden');
        authGate.classList.remove('hidden');
        setTimeout(() => { window.location.href = 'store.html'; }, 2000);
        return;
    }

    // 2. Check admin role
    try {
        const { data: isAdmin, error } = await supabase.rpc('is_admin');
        console.log('[DASH] is_admin RPC result:', { isAdmin, error });
        if (error || !isAdmin) {
            console.log('[DASH] Not admin — redirecting');
            skeleton.classList.add('hidden');
            authGate.classList.remove('hidden');
            setTimeout(() => { window.location.href = 'store.html'; }, 2000);
            return;
        }
    } catch (e) {
        console.error('[DASH] is_admin RPC threw:', e);
        skeleton.classList.add('hidden');
        authGate.classList.remove('hidden');
        setTimeout(() => { window.location.href = 'store.html'; }, 2000);
        return;
    }

    // 3. Set admin info in sidebar
    document.getElementById('adminName').textContent = user.username || 'OPERATOR';
    const initials = (user.username || 'OP').slice(0, 2).toUpperCase();
    document.getElementById('adminInitials').textContent = initials;

    // 4. Load orders
    allOrders = await fetchOrders();
    filteredOrders = allOrders;

    // 5. Render everything
    skeleton.classList.add('hidden');
    layout.classList.remove('hidden');

    renderOverview(allOrders);
    renderFilterCounts(allOrders);
    setupFilters();
    renderTable();
});
