// Admin dashboard — order management command center
import './imgFallback.js';
import { supabase } from '../config/supabase.js';
import { getCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../components/productRenderer.js';
import { shortId, getInitials } from '../utils/format.js';

// ─── State ───────────────────────────────────────
let allOrders = [];
let filteredOrders = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPage = 1;
const PAGE_SIZE = 15;

// Image upload state — holds File objects or existing URL strings
let pendingImageFront = null; // File | string (existing URL) | null
let pendingImageBack = null;

// ─── Image Upload ───────────────────────────────
function setupImageUpload(inputId, previewId, zoneId, setter) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const zone = document.getElementById(zoneId);

    const applyFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setter(file);
        if (preview.src.startsWith('blob:')) URL.revokeObjectURL(preview.src);
        preview.src = URL.createObjectURL(file);
        zone.classList.add('has-image');
    };

    input.addEventListener('change', () => applyFile(input.files[0]));

    // Drag-and-drop
    ['dragenter', 'dragover'].forEach(evt => {
        zone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (evt === 'dragleave' && zone.contains(e.relatedTarget)) return;
            zone.classList.remove('drag-over');
        });
    });
    zone.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        applyFile(file);
    });
}

// Convert any image File to WebP (and downscale to maxWidth) using the
// browser's Canvas API — no library, no build step. Cuts file size ~60%
// versus JPEG with no visible quality loss at 0.85. The 1600px ceiling
// covers retina/4K desktop displays without sacrificing retina-mobile
// fidelity; sources smaller than 1600px are passed through unchanged.
async function convertToWebP(file, maxWidth = 1600, quality = 0.85) {
    if (!(file instanceof Blob)) throw new Error('convertToWebP: not a Blob');
    if (file.type === 'image/webp') return file;

    const url = URL.createObjectURL(file);
    let img;
    try {
        img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Failed to decode image for WebP conversion'));
            i.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }

    const scale = Math.min(maxWidth / img.naturalWidth, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')), 'image/webp', quality);
    });

    const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
}

async function uploadImage(file, folder = 'products') {
    const optimized = await convertToWebP(file, 1600, 0.85);
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;

    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimized, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/webp'
        });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

// ─── Helpers ─────────────────────────────────────
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatPrice(amount) {
    return `₦${Number(amount).toLocaleString()}`;
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
        if (document.hidden) return;
        const now = new Date();
        el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

// ─── Mobile Sidebar ──────────────────────────────
function setupSidebar() {
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('sidebarScrim');

    function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        if (scrim) scrim.classList.remove('open');
    }

    toggle.addEventListener('click', () => {
        const opening = !sidebar.classList.contains('mobile-open');
        sidebar.classList.toggle('mobile-open');
        if (scrim) scrim.classList.toggle('open', opening);
    });

    // Close on scrim tap
    if (scrim) scrim.addEventListener('click', closeSidebar);

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
            closeSidebar();
        }
    });

    // Close sidebar when a nav item is tapped (mobile)
    sidebar.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
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

// ─── User Count (realtime) ───────────────────────
async function fetchAndSubscribeUsers() {
    // Initial count
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    const el = document.getElementById('ovUsers');
    const delta = document.getElementById('ovUsersDelta');

    if (error) {
        el.textContent = '—';
        delta.textContent = 'FETCH ERROR';
        return;
    }

    let userCount = count || 0;
    el.textContent = userCount;
    delta.textContent = 'REGISTERED';

    let pulseTimer = null;
    const pulseBadge = () => {
        delta.textContent = 'JUST UPDATED';
        if (pulseTimer) clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => { delta.textContent = 'REGISTERED'; pulseTimer = null; }, 3000);
    };

    // Realtime subscription — listen for new signups
    supabase
        .channel('admin-user-count')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
            userCount++;
            el.textContent = userCount;
            pulseBadge();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, () => {
            userCount = Math.max(0, userCount - 1);
            el.textContent = userCount;
            pulseBadge();
        })
        .subscribe();
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

    let dashSearchTimer = null;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(dashSearchTimer);
        dashSearchTimer = setTimeout(() => {
            currentSearch = e.target.value.trim();
            applyFilters();
        }, 180);
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
function renderOrdersSkeleton() {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const widths = [
        [70, 120, 50, 70, 60, 80, 24],
        [80, 150, 55, 70, 70, 90, 24],
        [65, 100, 45, 70, 55, 75, 24],
        [75, 140, 60, 70, 65, 85, 24],
        [70, 110, 50, 70, 60, 80, 24],
        [80, 130, 55, 70, 70, 85, 24],
    ];
    body.innerHTML = widths.map(row => `
        <tr class="skel-row">
            ${row.map(w => `<td><span class="skel-bar" style="width:${w}px"></span></td>`).join('')}
        </tr>`).join('');
}

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
        const customerName = escapeHtml(getCustomerName(order));
        const customerEmail = escapeHtml(getCustomerEmail(order));

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
let currentDetailOrderId = null;

function buildPipelineHtml(order) {
    return STATUS_FLOW.map((step, i) => {
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
}

function buildActionsHtml(order) {
    const next = nextStatus(order.status);
    const isFinal = order.status === 'delivered' || order.status === 'cancelled';
    if (isFinal) return '';
    let html = '';
    if (next) {
        html += `
            <button class="status-action-btn advance-btn" data-order-id="${order.id}" data-status="${next}">
                <span class="btn-shine"></span>
                ${STATUS_ICONS[next]} ADVANCE TO ${next.toUpperCase()}
            </button>`;
    }
    html += `
        <button class="status-action-btn cancel-btn" data-order-id="${order.id}" data-status="cancelled">
            <span class="btn-shine"></span>
            ${STATUS_ICONS.cancelled} CANCEL ORDER
        </button>`;
    return html;
}

// Patch only the parts that change on a status advance — no full rebuild
function patchDetailStatus(order) {
    const pipeline = document.querySelector('#detailBody .pipeline');
    const actions = document.querySelector('#detailBody .status-actions');
    const actionsHolder = document.querySelector('#detailBody .status-actions-holder');
    if (pipeline) pipeline.innerHTML = buildPipelineHtml(order);
    const newActionsHtml = buildActionsHtml(order);
    if (actionsHolder) actionsHolder.innerHTML = newActionsHtml ? `<div class="status-actions">${newActionsHtml}</div>` : '';
}

function openDetail(order) {
    const overlay = document.getElementById('detailOverlay');
    const panel = document.getElementById('detailPanel');
    const title = document.getElementById('detailTitle');
    const sub = document.getElementById('detailSub');
    const body = document.getElementById('detailBody');

    title.textContent = `ORDER ${shortId(order.id)}`;
    sub.textContent = `CMD.VIEW // ${formatDate(order.created_at)}`;

    // Re-opening the same order (e.g., after a status advance) — patch, don't rebuild
    if (currentDetailOrderId === order.id && panel.classList.contains('open')) {
        patchDetailStatus(order);
        return;
    }
    currentDetailOrderId = order.id;

    const items = order.order_items || [];
    const subtotal = items.reduce((s, i) => s + (Number(i.product_price || i.price) * i.quantity), 0);

    const pipelineHtml = buildPipelineHtml(order);
    const actionsInner = buildActionsHtml(order);
    const actionsHtml = actionsInner ? `<div class="status-actions">${actionsInner}</div>` : '';

    // Items list
    const itemsHtml = items.map(item => `
        <div class="detail-item">
            <div class="di-thumb">
                ${item.product_image ? `<img src="${escapeHtml(item.product_image)}" alt="${escapeHtml(item.product_name)}">` : ''}
            </div>
            <div class="di-info">
                <div class="di-name">${escapeHtml(item.product_name)}</div>
                <div class="di-meta">SIZE: ${escapeHtml(item.size || 'N/A')} // QTY: ${item.quantity}</div>
            </div>
            <div class="di-price">${formatPrice(Number(item.product_price || item.price) * item.quantity)}</div>
        </div>
    `).join('');

    const ccName = getCustomerName(order);
    const ccIsRegistered = !!order.user_id;
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);

    body.innerHTML = `
        <div class="customer-context">
            <div class="cc-avatar">${escapeHtml(getInitials(ccName))}</div>
            <div class="cc-info">
                <div class="cc-name">${escapeHtml(ccName)}</div>
                <div class="cc-meta">
                    <span class="cc-type ${ccIsRegistered ? 'registered' : 'guest'}">${ccIsRegistered ? 'REGISTERED' : 'GUEST'}</span>
                    <span class="cc-items">${itemCount} ITEM${itemCount === 1 ? '' : 'S'}</span>
                </div>
            </div>
        </div>

        <div class="pipeline">${pipelineHtml}</div>

        <div class="status-actions-holder">${actionsHtml}</div>

        <div class="detail-section cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>CUSTOMER INFO</div>
            <div class="info-row">
                <span class="info-label">NAME</span>
                <span class="info-value">${escapeHtml(getCustomerName(order))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">EMAIL</span>
                <span class="info-value">${escapeHtml(getCustomerEmail(order))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">TYPE</span>
                <span class="info-value">${order.user_id ? 'Registered' : 'Guest'}</span>
            </div>
            ${order.shipping_phone ? `
            <div class="info-row">
                <span class="info-label">PHONE</span>
                <span class="info-value">${escapeHtml(order.shipping_phone)}</span>
            </div>` : ''}
        </div>

        <div class="detail-section cb">
            <div class="cb-b"></div><div class="scanlines"></div>
            <div class="detail-section-title"><div class="ds-bar"></div>SHIPPING</div>
            <div class="info-row">
                <span class="info-label">ADDRESS</span>
                <span class="info-value">${escapeHtml(order.shipping_address || 'N/A')}</span>
            </div>
            ${order.shipping_city ? `
            <div class="info-row">
                <span class="info-label">CITY</span>
                <span class="info-value">${escapeHtml(order.shipping_city)}</span>
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
                <span class="info-value mono">${escapeHtml(order.payment_reference || 'N/A')}</span>
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

    overlay.classList.add('open');
    panel.classList.add('open');
}

// Handle a click on any status-action button (delegated — bound once on init)
async function handleStatusActionClick(btn) {
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

        // Local mutation — no network refetch
        const idx = allOrders.findIndex(o => o.id === orderId);
        if (idx >= 0) allOrders[idx].status = newStatus;

        renderOverview(allOrders);
        renderFilterCounts(allOrders);
        applyFilters();

        // Re-open same order — openDetail will patch in place, not rebuild
        if (idx >= 0) openDetail(allOrders[idx]);
        else closeDetail();
    } catch (err) {
        showToast(`FAILED: ${err.message}`, true);
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
    document.getElementById('detailPanel').classList.remove('open');
    currentDetailOrderId = null;
}

function setupDetailPanel() {
    document.getElementById('detailOverlay').addEventListener('click', closeDetail);
    document.getElementById('closeDetailBtn').addEventListener('click', closeDetail);

    // Delegated click for status-action buttons — bound once, handles every re-render
    document.getElementById('detailBody').addEventListener('click', (e) => {
        const btn = e.target.closest('.status-action-btn');
        if (!btn || btn.disabled) return;
        e.stopPropagation();
        handleStatusActionClick(btn);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetail();
    });
}

// ─── Global shortcuts ───────────────────────────
function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const input = document.getElementById('searchInput');
            if (input) { input.focus(); input.select(); }
        }
    });
}

// ─── Section Switching ──────────────────────────
function setupSectionNav() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.section-panel');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.section;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const el = document.getElementById('section' + target.charAt(0).toUpperCase() + target.slice(1));
            if (el) el.classList.add('active');

            // Lazy-load products on first visit
            if (target === 'products' && !productsLoaded) loadProducts();
        });
    });
}

// ─── Product Management ─────────────────────────
let productsLoaded = false;
let allProducts = [];
let editingProductId = null;
const selectedProducts = new Set();

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['7', '8', '9', '10', '11', '12'];
const ONE_SIZE = ['One Size'];

function getSizesForCategory(cat) {
    if (cat === 'shoes') return SHOE_SIZES;
    if (cat === 'bags' || cat === 'other') return ONE_SIZE;
    return CLOTHING_SIZES;
}

function renderSizesGrid(category) {
    const grid = document.getElementById('sizesGrid');
    const sizes = getSizesForCategory(category || 'hoodies');
    grid.innerHTML = sizes.map(s =>
        `<div class="size-field">
            <span class="size-label">${s}</span>
            <input class="size-input" type="number" min="0" value="0" data-size="${s}" placeholder="0">
        </div>`
    ).join('');
    // Chip active state reflects stock > 0
    grid.querySelectorAll('.size-input').forEach(inp => {
        const field = inp.closest('.size-field');
        const sync = () => field.classList.toggle('is-active', (parseInt(inp.value) || 0) > 0);
        sync();
        inp.addEventListener('input', sync);
    });
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div class="empty-state"><p>LOADING CATALOG...</p></div>';

    const { data, error } = await supabase
        .from('products')
        .select('*, product_sizes (size, stock)')
        .order('id', { ascending: false });

    if (error) {
        grid.innerHTML = '<div class="empty-state"><p>FAILED TO LOAD PRODUCTS</p></div>';
        showToast('FAILED TO LOAD PRODUCTS', true);
        return;
    }

    allProducts = data || [];
    productsLoaded = true;
    selectedProducts.clear();
    updateBulkToolbar();
    document.getElementById('productsCount').textContent = `${allProducts.length} PRODUCTS`;
    renderProductsGrid();
}

function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (allProducts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg><p>NO PRODUCTS IN CATALOG</p></div>';
        return;
    }

    grid.innerHTML = allProducts.map(p => {
        const totalStock = (p.product_sizes || []).reduce((sum, s) => sum + s.stock, 0) || p.stock || 0;
        const stockClass = totalStock < 20 ? ' low' : '';
        const checked = selectedProducts.has(p.id) ? ' checked' : '';
        const selectedClass = selectedProducts.has(p.id) ? ' selected' : '';
        return `<div class="prod-card cb${selectedClass}" data-product-id="${p.id}">
            <div class="cb-b"></div>
            <label class="prod-select-checkbox" onclick="event.stopPropagation()">
                <input type="checkbox" data-select-id="${p.id}"${checked}>
                <span class="prod-checkmark"></span>
            </label>
            <div class="prod-card-actions">
                <button class="prod-action-btn" onclick="window.__editProduct(${p.id})" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="prod-action-btn danger" onclick="window.__deleteProduct(${p.id})" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
            <img class="prod-card-img" src="${escapeHtml(p.image_front)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" width="260" height="180">
            <div class="prod-card-body">
                <div class="prod-card-name">${escapeHtml(p.name)}</div>
                <div class="prod-card-meta">
                    <span class="prod-card-brand">${escapeHtml(p.brand || '—')}</span>
                    <span class="prod-card-cat">${escapeHtml(p.category)}</span>
                </div>
                <div class="prod-card-footer">
                    <span class="prod-card-price">${formatPrice(p.price)}</span>
                    <span class="prod-card-stock${stockClass}">STOCK: ${totalStock}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function setupProductsGridEvents() {
    const grid = document.getElementById('productsGrid');
    if (!grid || grid.dataset.eventsBound) return;
    grid.dataset.eventsBound = '1';
    grid.addEventListener('change', (e) => {
        const cb = e.target.closest('[data-select-id]');
        if (!cb) return;
        const id = parseInt(cb.dataset.selectId);
        if (cb.checked) selectedProducts.add(id);
        else selectedProducts.delete(id);
        cb.closest('.prod-card').classList.toggle('selected', cb.checked);
        updateBulkToolbar();
    });
}

function updateBulkToolbar() {
    const toolbar = document.getElementById('bulkToolbar');
    const count = selectedProducts.size;
    const selectAllCb = document.getElementById('selectAllProducts');

    if (count > 0) {
        toolbar.classList.remove('hidden');
        document.getElementById('bulkCount').textContent = `${count} SELECTED`;
    } else {
        toolbar.classList.add('hidden');
    }

    if (selectAllCb) {
        selectAllCb.checked = count > 0 && count === allProducts.length;
        selectAllCb.indeterminate = count > 0 && count < allProducts.length;
    }
}

function toggleSelectAll(checked) {
    if (checked) {
        allProducts.forEach(p => selectedProducts.add(p.id));
    } else {
        selectedProducts.clear();
    }
    // Update all checkboxes visually
    document.querySelectorAll('[data-select-id]').forEach(cb => {
        cb.checked = checked;
        cb.closest('.prod-card').classList.toggle('selected', checked);
    });
    updateBulkToolbar();
}

async function bulkDeleteProducts() {
    const count = selectedProducts.size;
    if (count === 0) return;
    if (!confirm(`DELETE ${count} PRODUCT${count > 1 ? 'S' : ''}?\n\nThis action cannot be undone.`)) return;

    const ids = [...selectedProducts];
    try {
        const { error } = await supabase.from('products').delete().in('id', ids);
        if (error) throw error;
        selectedProducts.clear();
        updateBulkToolbar();
        showToast(`${count} PRODUCT${count > 1 ? 'S' : ''} DELETED`);
        const idSet = new Set(ids);
        allProducts = allProducts.filter(p => !idSet.has(p.id));
        document.getElementById('productsCount').textContent = `${allProducts.length} PRODUCTS`;
        renderProductsGrid();
    } catch (err) {
        showToast('BULK DELETE FAILED', true);
    }
}

function openProductModal(product = null) {
    editingProductId = product ? product.id : null;
    const overlay = document.getElementById('productModalOverlay');
    const title = document.getElementById('productModalTitle');
    const submitBtn = document.getElementById('productModalSubmit');

    title.textContent = product ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT';
    const subtitle = document.getElementById('productModalSubtitle');
    if (subtitle) subtitle.textContent = product ? '> MODIFY PRODUCT //' : '> DEPLOY NEW PRODUCT //';
    submitBtn.innerHTML = `<span class="btn-shine"></span>${product ? 'UPDATE PRODUCT' : 'DEPLOY PRODUCT'}`;

    document.getElementById('pf_name').value = product ? product.name : '';
    document.getElementById('pf_price').value = product ? product.price : '';
    document.getElementById('pf_brand').value = product ? product.brand || '' : '';
    document.getElementById('pf_category').value = product ? product.category : '';
    document.getElementById('pf_stock').value = product ? product.stock || 0 : '';

    // Reset file inputs and previews
    document.getElementById('pf_image_front').value = '';
    document.getElementById('pf_image_back').value = '';
    const previewFront = document.getElementById('preview_front');
    const previewBack = document.getElementById('preview_back');
    const zoneFront = document.getElementById('zone_front');
    const zoneBack = document.getElementById('zone_back');

    if (product && product.image_front) {
        previewFront.src = product.image_front;
        zoneFront.classList.add('has-image');
        pendingImageFront = product.image_front; // existing URL
    } else {
        previewFront.src = '';
        zoneFront.classList.remove('has-image');
        pendingImageFront = null;
    }

    if (product && product.image_back) {
        previewBack.src = product.image_back;
        zoneBack.classList.add('has-image');
        pendingImageBack = product.image_back;
    } else {
        previewBack.src = '';
        zoneBack.classList.remove('has-image');
        pendingImageBack = null;
    }

    const cat = product ? product.category : document.getElementById('pf_category').value;
    renderSizesGrid(cat);

    // Fill in existing size stock values
    if (product && product.product_sizes) {
        product.product_sizes.forEach(ps => {
            const inp = document.querySelector(`.size-input[data-size="${ps.size}"]`);
            if (inp) {
                inp.value = ps.stock;
                inp.dispatchEvent(new Event('input'));
            }
        });
    }

    overlay.classList.add('open');
    updateLivePreview();
}

function closeProductModal() {
    document.getElementById('productModalOverlay').classList.remove('open');
    document.getElementById('productForm').reset();
    document.getElementById('zone_front').classList.remove('has-image');
    document.getElementById('zone_back').classList.remove('has-image');
    // Revoke blob URLs before clearing
    const prevFront = document.getElementById('preview_front');
    const prevBack = document.getElementById('preview_back');
    if (prevFront.src.startsWith('blob:')) URL.revokeObjectURL(prevFront.src);
    if (prevBack.src.startsWith('blob:')) URL.revokeObjectURL(prevBack.src);
    prevFront.src = '';
    prevBack.src = '';
    pendingImageFront = null;
    pendingImageBack = null;
    editingProductId = null;
}

async function submitProduct() {
    const btn = document.getElementById('productModalSubmit');
    const wasEditing = !!editingProductId;
    const name = document.getElementById('pf_name').value.trim();
    const price = parseInt(document.getElementById('pf_price').value);
    const brand = document.getElementById('pf_brand').value;
    const category = document.getElementById('pf_category').value;
    const stock = parseInt(document.getElementById('pf_stock').value) || 0;

    if (!name || !price || !brand || !category || !pendingImageFront) {
        showToast('FILL ALL REQUIRED FIELDS', true);
        return;
    }

    // Collect size stocks
    const sizeInputs = document.querySelectorAll('.size-input');
    const sizes = [];
    sizeInputs.forEach(inp => {
        const qty = parseInt(inp.value) || 0;
        if (qty > 0) sizes.push({ size: inp.dataset.size, stock: qty });
    });

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-shine"></span>UPLOADING...';

    try {
        // Upload images if they're File objects, otherwise keep existing URLs
        const zoneFront = document.getElementById('zone_front');
        const zoneBack = document.getElementById('zone_back');

        let imageFront;
        if (pendingImageFront instanceof File) {
            zoneFront.classList.add('uploading');
            imageFront = await uploadImage(pendingImageFront);
            zoneFront.classList.remove('uploading');
        } else {
            imageFront = pendingImageFront; // existing URL string
        }

        let imageBack = null;
        if (pendingImageBack instanceof File) {
            zoneBack.classList.add('uploading');
            imageBack = await uploadImage(pendingImageBack);
            zoneBack.classList.remove('uploading');
        } else if (pendingImageBack) {
            imageBack = pendingImageBack;
        }

        btn.innerHTML = '<span class="btn-shine"></span>DEPLOYING...';

        if (editingProductId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update({ name, price, brand, category, stock, image_front: imageFront, image_back: imageBack })
                .eq('id', editingProductId);
            if (error) throw error;

            // Delete old sizes and re-insert
            await supabase.from('product_sizes').delete().eq('product_id', editingProductId);
            if (sizes.length > 0) {
                const sizeRows = sizes.map(s => ({ product_id: editingProductId, size: s.size, stock: s.stock }));
                const { error: sErr } = await supabase.from('product_sizes').insert(sizeRows);
                if (sErr) throw sErr;
            }

            // Local mutation — no refetch
            const idx = allProducts.findIndex(p => p.id === editingProductId);
            if (idx >= 0) {
                allProducts[idx] = {
                    ...allProducts[idx],
                    name, price, brand, category, stock,
                    image_front: imageFront, image_back: imageBack,
                    product_sizes: sizes.map(s => ({ size: s.size, stock: s.stock })),
                };
            }

            showToast('PRODUCT UPDATED');
        } else {
            // Insert new product
            const { data: newProd, error } = await supabase
                .from('products')
                .insert([{ name, price, brand, category, stock, image_front: imageFront, image_back: imageBack }])
                .select()
                .single();
            if (error) throw error;

            // Insert sizes
            if (sizes.length > 0) {
                const sizeRows = sizes.map(s => ({ product_id: newProd.id, size: s.size, stock: s.stock }));
                const { error: sErr } = await supabase.from('product_sizes').insert(sizeRows);
                if (sErr) throw sErr;
            }

            // Local mutation — prepend to match .order('id', { ascending: false })
            allProducts.unshift({
                ...newProd,
                product_sizes: sizes.map(s => ({ size: s.size, stock: s.stock })),
            });

            showToast('PRODUCT DEPLOYED');
        }

        closeProductModal();
        document.getElementById('productsCount').textContent = `${allProducts.length} PRODUCTS`;
        renderProductsGrid();
    } catch (err) {
        showToast('FAILED TO SAVE PRODUCT', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="btn-shine"></span>${wasEditing ? 'UPDATE PRODUCT' : 'DEPLOY PRODUCT'}`;
    }
}

async function deleteProduct(id) {
    if (!confirm('DELETE THIS PRODUCT?\n\nThis action cannot be undone.')) return;

    try {
        // product_sizes will cascade-delete
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        showToast('PRODUCT DELETED');
        allProducts = allProducts.filter(p => p.id !== id);
        document.getElementById('productsCount').textContent = `${allProducts.length} PRODUCTS`;
        renderProductsGrid();
    } catch (err) {
        showToast('FAILED TO DELETE PRODUCT', true);
    }
}

function updateLivePreview() {
    const name = document.getElementById('pf_name').value.trim() || 'Product name';
    const price = parseInt(document.getElementById('pf_price').value) || 0;
    const brand = document.getElementById('pf_brand').value || 'BRAND';
    const category = document.getElementById('pf_category').value || 'CATEGORY';
    const stock = parseInt(document.getElementById('pf_stock').value) || 0;

    document.getElementById('previewCardName').textContent = name;
    document.getElementById('previewCardPrice').textContent = formatPrice(price);
    document.getElementById('previewCardBrand').textContent = brand.toUpperCase();
    document.getElementById('previewCardCategory').textContent = category.toUpperCase();
    document.getElementById('previewCardStock').textContent = `STOCK: ${stock}`;

    const img = document.getElementById('previewCardImg');
    const frontSrc = document.getElementById('preview_front').getAttribute('src');
    if (frontSrc) {
        img.src = frontSrc;
    } else {
        img.removeAttribute('src');
    }
}

function setupProductModal() {
    document.getElementById('btnAddProduct').addEventListener('click', () => openProductModal());
    document.getElementById('productModalClose').addEventListener('click', closeProductModal);
    document.getElementById('productModalCancel').addEventListener('click', closeProductModal);
    document.getElementById('productModalSubmit').addEventListener('click', submitProduct);
    document.getElementById('productModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeProductModal();
    });

    // Update sizes grid when category changes
    document.getElementById('pf_category').addEventListener('change', (e) => {
        renderSizesGrid(e.target.value);
        updateLivePreview();
    });

    // Live preview sync
    ['pf_name', 'pf_price', 'pf_brand', 'pf_stock'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateLivePreview);
    });

    // Cmd/Ctrl + Enter submits while modal is open
    document.getElementById('productModalOverlay').addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submitProduct();
        }
    });

    // Image upload listeners — wrap setter to refresh preview
    setupImageUpload('pf_image_front', 'preview_front', 'zone_front', (f) => { pendingImageFront = f; setTimeout(updateLivePreview, 0); });
    setupImageUpload('pf_image_back', 'preview_back', 'zone_back', (f) => { pendingImageBack = f; });

    // Bulk actions
    document.getElementById('selectAllProducts').addEventListener('change', (e) => {
        toggleSelectAll(e.target.checked);
    });
    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDeleteProducts);
    document.getElementById('bulkClearBtn').addEventListener('click', () => {
        selectedProducts.clear();
        document.querySelectorAll('[data-select-id]').forEach(cb => {
            cb.checked = false;
            cb.closest('.prod-card').classList.remove('selected');
        });
        updateBulkToolbar();
    });

    // Expose to inline onclick handlers
    window.__editProduct = (id) => {
        const p = allProducts.find(prod => prod.id === id);
        if (p) openProductModal(p);
    };
    window.__deleteProduct = deleteProduct;
}

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for terminal auth veil (runs from inline script in dashboard.html)
    if (window.__s97VeilDone) await window.__s97VeilDone;

    setupTheme();
    startClock();
    setupSidebar();
    setupDetailPanel();
    setupShortcuts();

    const skeleton = document.getElementById('dashSkeleton');
    const authGate = document.getElementById('authGate');
    const layout = document.getElementById('dashLayout');

    // 1. Check auth
    const user = await getCurrentUser();
    if (!user) {
        skeleton.classList.add('hidden');
        authGate.classList.remove('hidden');
        setTimeout(() => { window.location.href = 'shop.html'; }, 2000);
        return;
    }

    // 2. Check admin role
    try {
        const { data: isAdmin, error } = await supabase.rpc('is_admin');
        if (error || !isAdmin) {
            skeleton.classList.add('hidden');
            authGate.classList.remove('hidden');
            setTimeout(() => { window.location.href = 'shop.html'; }, 2000);
            return;
        }
    } catch (e) {
        skeleton.classList.add('hidden');
        authGate.classList.remove('hidden');
        setTimeout(() => { window.location.href = 'shop.html'; }, 2000);
        return;
    }

    // 3. Set admin info in sidebar
    document.getElementById('adminName').textContent = user.username || 'OPERATOR';
    const initials = (user.username || 'OP').slice(0, 2).toUpperCase();
    document.getElementById('adminInitials').textContent = initials;

    // 4. Reveal dashboard chrome with shimmer rows while orders load
    skeleton.classList.add('hidden');
    layout.classList.remove('hidden');
    renderOrdersSkeleton();

    // 5. Load orders
    allOrders = await fetchOrders();
    filteredOrders = allOrders;

    // 6. Render real data
    renderOverview(allOrders);
    fetchAndSubscribeUsers();
    renderFilterCounts(allOrders);
    setupFilters();
    renderTable();

    // Section nav + product management
    setupSectionNav();
    setupProductModal();
    setupProductsGridEvents();
});
