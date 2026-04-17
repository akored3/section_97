// Product reviews — fetch, submit, render, and star ratings for SECTION-97
import { supabase } from '../config/supabase.js';
import { getCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../components/productRenderer.js';

// ── Fetch reviews for a product ──
export async function fetchReviews(productId) {
    const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, fit, body, created_at, user_id')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    if (error) return [];
    if (data.length === 0) return [];

    // Batch-fetch usernames + avatars from profiles (non-fatal if this fails)
    const userIds = [...new Set(data.map(r => r.user_id))];
    let profileMap = new Map();
    try {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);
        profileMap = new Map((profiles || []).map(p => [p.id, { username: p.username, avatar: p.avatar_url }]));
    } catch (_) {
        // Profiles unavailable — reviews still render with fallback names
    }

    return data.map(r => {
        const profile = profileMap.get(r.user_id);
        return {
            ...r,
            username: profile?.username || 'ANONYMOUS',
            avatar: profile?.avatar || null
        };
    });
}

// ── Fetch average ratings for multiple products (store cards) ──
async function fetchProductRatings(productIds) {
    if (!productIds || productIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds);

    if (error) return new Map();

    const map = new Map();
    for (const r of data) {
        if (!map.has(r.product_id)) map.set(r.product_id, []);
        map.get(r.product_id).push(r.rating);
    }

    // Convert to { avg, count }
    const result = new Map();
    for (const [id, ratings] of map) {
        const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
        result.set(id, { avg: Math.round(avg * 10) / 10, count: ratings.length });
    }
    return result;
}

// ── Check if current user has purchased this product ──
export async function hasPurchased(productId) {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data } = await supabase.rpc('has_purchased_product', {
        p_user_id: user.id,
        p_product_id: productId
    });
    return !!data;
}

// ── Submit a review via RPC ──
export async function submitReview(productId, rating, fit, body) {
    // Client-side validation before hitting the network
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { error: 'Rating must be 1-5' };
    }
    if (fit && !['small', 'tts', 'large'].includes(fit)) {
        return { error: 'Invalid fit value' };
    }
    if (!body || body.trim().length < 10 || body.length > 500) {
        return { error: 'Review must be 10-500 characters' };
    }

    const { data, error } = await supabase.rpc('submit_review', {
        p_product_id: productId,
        p_rating: rating,
        p_fit: fit || null,
        p_body: body
    });

    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { success: true };
}

// ── Delete own review ──
async function deleteReview(productId) {
    const { data, error } = await supabase.rpc('delete_review', {
        p_product_id: productId
    });
    if (error) return { error: error.message };
    return { success: true };
}

// ── Generate star SVGs ──
let _starGradientId = 0;
export function renderStars(rating, size = 16) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            // Full star
            html += `<svg class="rv-star rv-star-full" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="currentColor" stroke-width="1"/></svg>`;
        } else if (i - rating < 1 && i - rating > 0) {
            // Half star — unique gradient ID to avoid SVG collisions
            const gid = `rv-half-${++_starGradientId}`;
            html += `<svg class="rv-star rv-star-half" viewBox="0 0 24 24" width="${size}" height="${size}">
                <defs><linearGradient id="${gid}"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#${gid})" stroke="currentColor" stroke-width="1"/>
            </svg>`;
        } else {
            // Empty star
            html += `<svg class="rv-star rv-star-empty" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
        }
    }
    return html;
}

// ── Compact star + rating for store cards ──
function renderCardRating(avg, count) {
    if (!count) return '';
    return `<div class="card-rating">
        <svg class="rv-star rv-star-full" viewBox="0 0 24 24" width="13" height="13"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="currentColor" stroke-width="1"/></svg>
        <span class="card-rating-avg">${avg}</span>
        <span class="card-rating-count">(${count})</span>
    </div>`;
}

// ── Inject star ratings into store product cards (fire-and-forget) ──
export function injectCardRatings(productIds) {
    fetchProductRatings(productIds).then(ratings => {
        document.querySelectorAll('.product-card').forEach(card => {
            const id = parseInt(card.querySelector('.add-to-cart-btn')?.dataset.id);
            const info = ratings.get(id);
            if (info) {
                const priceRow = card.querySelector('.product-price-row');
                if (priceRow) {
                    const ratingEl = document.createElement('div');
                    ratingEl.innerHTML = renderCardRating(info.avg, info.count);
                    const ratingDiv = ratingEl.firstElementChild;
                    if (ratingDiv) priceRow.parentNode.insertBefore(ratingDiv, priceRow);
                }
            }
        });
    });
}

// ── Fit label map ──
const FIT_LABELS = { small: 'RUNS SMALL', tts: 'TRUE TO SIZE', large: 'RUNS LARGE' };

// ── Render the full review section on PDP ──
export function renderReviewSection(reviews, canReview, userReview, productId) {
    const container = document.getElementById('rv-section');
    if (!container) return;

    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    const roundedAvg = Math.round(avg * 10) / 10;

    // Rating distribution
    const dist = [0, 0, 0, 0, 0];
    const fitCounts = { small: 0, tts: 0, large: 0 };
    let fitTotal = 0;
    reviews.forEach(r => {
        dist[r.rating - 1]++;
        if (r.fit) { fitCounts[r.fit]++; fitTotal++; }
    });

    // Build HTML
    let html = `
        <div class="rv-header">
            <div class="rv-header-left">
                <h2 class="rv-title">REVIEWS</h2>
                <span class="rv-count">// ${count} ${count === 1 ? 'REVIEW' : 'REVIEWS'}</span>
            </div>
            ${count > 0 ? `
            <div class="rv-header-right">
                <span class="rv-avg">${roundedAvg}</span>
                <div class="rv-stars">${renderStars(avg, 20)}</div>
            </div>` : ''}
        </div>`;

    // Summary bar (only if reviews exist)
    if (count > 0) {
        html += `<div class="rv-summary">
            <div class="rv-distribution">
                ${[5, 4, 3, 2, 1].map(star => {
                    const c = dist[star - 1];
                    const pct = count > 0 ? (c / count) * 100 : 0;
                    return `<div class="rv-dist-row">
                        <span class="rv-dist-label">${star}★</span>
                        <div class="rv-dist-bar"><div class="rv-dist-fill" style="width:${pct}%"></div></div>
                        <span class="rv-dist-count">(${c})</span>
                    </div>`;
                }).join('')}
            </div>
            ${fitTotal > 0 ? `<div class="rv-fit-summary">
                ${Object.entries(fitCounts).filter(([, c]) => c > 0).map(([fit, c]) => {
                    const pct = Math.round((c / fitTotal) * 100);
                    return `<span class="rv-fit-pill${pct >= 50 ? ' rv-fit-dominant' : ''}">${FIT_LABELS[fit]} ${pct}%</span>`;
                }).join('')}
            </div>` : ''}
        </div>`;
    }

    // Review form (only if user can review)
    if (canReview) {
        const isEdit = !!userReview;
        html += `
        <div class="rv-form-wrapper" id="rv-form-wrapper">
            <button class="rv-write-btn" id="rv-write-toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                ${isEdit ? 'EDIT YOUR REVIEW' : 'WRITE A REVIEW'}
            </button>
            <form class="rv-form hidden" id="rv-form">
                <div class="rv-form-stars" id="rv-form-stars">
                    <span class="rv-form-label">RATING</span>
                    <div class="rv-star-input" id="rv-star-input" role="radiogroup" aria-label="Product rating">
                        ${[1,2,3,4,5].map(i => `<button type="button" class="rv-star-btn${userReview && i <= userReview.rating ? ' active' : ''}" data-rating="${i}" aria-label="${i} star${i > 1 ? 's' : ''}" aria-pressed="${userReview && i <= userReview.rating ? 'true' : 'false'}">
                            <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </button>`).join('')}
                    </div>
                </div>
                <div class="rv-form-fit">
                    <span class="rv-form-label">FIT</span>
                    <div class="rv-fit-input" id="rv-fit-input">
                        ${['small', 'tts', 'large'].map(f => `<button type="button" class="rv-fit-btn${userReview?.fit === f ? ' active' : ''}" data-fit="${f}">${FIT_LABELS[f]}</button>`).join('')}
                    </div>
                </div>
                <div class="rv-form-body">
                    <textarea id="rv-body" class="rv-textarea" placeholder="How's the quality? How does it fit? Would you recommend it?" maxlength="500" minlength="10" aria-describedby="rv-char-count">${userReview ? escapeHtml(userReview.body) : ''}</textarea>
                    <span class="rv-char-count" id="rv-char-count" aria-live="polite">${userReview ? userReview.body.length : 0}/500</span>
                </div>
                <div class="rv-form-actions">
                    <button type="submit" class="rv-submit-btn" id="rv-submit-btn" disabled>
                        ${isEdit ? 'UPDATE REVIEW' : 'POST REVIEW'}
                    </button>
                    ${isEdit ? `<button type="button" class="rv-delete-btn" id="rv-delete-btn">DELETE</button>` : ''}
                </div>
            </form>
        </div>`;
    }

    // Review cards
    if (count > 0) {
        html += `<div class="rv-list" id="rv-list">
            ${reviews.map(r => renderReviewCard(r)).join('')}
        </div>`;
    } else {
        html += `<div class="rv-empty">
            <svg class="rv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <p>NO REVIEWS YET</p>
            ${canReview ? '<span class="rv-empty-cta">BE THE FIRST TO DROP ONE</span>' : '<span class="rv-empty-hint">PURCHASE TO REVIEW</span>'}
        </div>`;
    }

    container.innerHTML = html;
}

// ── Generate initials fallback avatar ──
function avatarFallback(username) {
    const initial = (username || '?')[0].toUpperCase();
    return `<div class="rv-avatar rv-avatar-fallback">${initial}</div>`;
}

// ── Single review card ──
function renderReviewCard(review) {
    const date = new Date(review.created_at);
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

    const initial = (review.username || '?')[0].toUpperCase();
    const avatarHtml = review.avatar
        ? `<div class="rv-avatar-wrap">
            <img class="rv-avatar" src="${escapeHtml(review.avatar)}" alt="${escapeHtml(review.username)}">
            <div class="rv-avatar rv-avatar-fallback" style="display:none">${initial}</div>
           </div>`
        : `<div class="rv-avatar rv-avatar-fallback">${initial}</div>`;

    return `<div class="rv-card">
        <div class="rv-card-header">
            ${avatarHtml}
            <div class="rv-card-meta">
                <div class="rv-card-user">
                    <span class="rv-username">${escapeHtml(review.username)}</span>
                    <span class="rv-verified" title="Verified purchase">✓ VERIFIED</span>
                </div>
                <div class="rv-card-stars">${renderStars(review.rating, 14)}</div>
            </div>
        </div>
        <p class="rv-card-body">${escapeHtml(review.body)}</p>
        <div class="rv-card-footer">
            ${review.fit ? `<span class="rv-fit-tag">${FIT_LABELS[review.fit]}</span>` : ''}
            <span class="rv-card-date">${dateStr}</span>
        </div>
    </div>`;
}

// ── Setup form interactivity ──
export function setupReviewForm(productId, onSubmitted) {
    const toggle = document.getElementById('rv-write-toggle');
    const form = document.getElementById('rv-form');
    if (!toggle || !form) return;

    let selectedRating = 0;
    let selectedFit = null;

    // Check if editing (pre-filled)
    const activeStars = form.querySelectorAll('.rv-star-btn.active');
    if (activeStars.length > 0) selectedRating = activeStars.length;
    const activeFit = form.querySelector('.rv-fit-btn.active');
    if (activeFit) selectedFit = activeFit.dataset.fit;

    // Toggle form visibility
    toggle.addEventListener('click', () => {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // Star input
    const starBtns = form.querySelectorAll('.rv-star-btn');
    starBtns.forEach((btn, index) => {
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.dataset.rating);
            starBtns.forEach(b => {
                b.classList.toggle('hover', parseInt(b.dataset.rating) <= val);
            });
        });
        btn.addEventListener('click', () => {
            selectedRating = parseInt(btn.dataset.rating);
            starBtns.forEach(b => {
                const active = parseInt(b.dataset.rating) <= selectedRating;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', active);
            });
            validateForm();
        });
        // Keyboard arrow navigation
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && index < starBtns.length - 1) {
                e.preventDefault();
                starBtns[index + 1].focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                starBtns[index - 1].focus();
            }
        });
    });
    // Reset hover on mouse leave
    const starInput = document.getElementById('rv-star-input');
    if (starInput) {
        starInput.addEventListener('mouseleave', () => {
            starBtns.forEach(b => {
                b.classList.toggle('hover', false);
            });
        });
    }

    // Fit selection
    const fitBtns = form.querySelectorAll('.rv-fit-btn');
    fitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                selectedFit = null;
            } else {
                fitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFit = btn.dataset.fit;
            }
        });
    });

    // Char count
    const textarea = document.getElementById('rv-body');
    const charCount = document.getElementById('rv-char-count');
    textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length}/500`;
        validateForm();
    });

    // Validate
    const submitBtn = document.getElementById('rv-submit-btn');
    function validateForm() {
        const bodyOk = textarea.value.trim().length >= 10;
        submitBtn.disabled = !(selectedRating > 0 && bodyOk);
    }
    validateForm();

    // Submit (with double-submit guard)
    const isEdit = !!form.querySelector('#rv-delete-btn');
    const defaultLabel = isEdit ? 'UPDATE REVIEW' : 'POST REVIEW';
    let submitting = false;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitting) return;
        submitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';

        const result = await submitReview(productId, selectedRating, selectedFit, textarea.value.trim());

        if (result.error) {
            submitting = false;
            submitBtn.textContent = result.error;
            setTimeout(() => {
                submitBtn.textContent = defaultLabel;
                submitBtn.disabled = false;
            }, 2500);
            return;
        }

        submitBtn.textContent = 'POSTED ✓';
        setTimeout(() => {
            submitting = false;
            onSubmitted();
        }, 600);
    });

    // Delete
    const deleteBtn = document.getElementById('rv-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            deleteBtn.textContent = 'DELETING...';
            await deleteReview(productId);
            onSubmitted();
        });
    }
}
