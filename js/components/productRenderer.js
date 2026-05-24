// Handles rendering products to the DOM
import { isWishlisted, toggleWishlist, getLikeCount } from '../ui/wishlist.js';
import { formatPrice } from '../config/currency.js';

// Escape HTML to prevent XSS from dynamic data
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Size data stored in JS (avoids HTML attribute escaping issues)
export const productSizesMap = new Map();

export function renderProducts(productsToRender) {
    const productContainer = document.getElementById("product-container");

    if (!productContainer) {
        return;
    }

    const html = productsToRender.map((product, index) => {
        const hasBackImage = product.imageBack && product.imageBack !== null;

        const safeName = escapeHtml(product.name);
        const safePrice = escapeHtml(product.price);
        const safeId = escapeHtml(product.id);
        const safeStock = escapeHtml(product.stock ?? '');
        const safeImage = escapeHtml(product.imageSrc);
        const safeBack = hasBackImage ? escapeHtml(product.imageBack) : '';
        const formattedPrice = formatPrice(product.price);

        // Store sizes in JS Map keyed by product ID
        productSizesMap.set(String(product.id), product.sizes || []);

        // Browser-native lazy loading handles below-fold deferral
        const imgClass = 'product loaded';
        const imgSrc = safeImage;

        const isNew = product.isNew;

        // Low stock: sum all size stocks (or fall back to product.stock)
        const sizes = product.sizes || [];
        const totalStock = sizes.length > 0
            ? sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
            : (product.stock || 0);
        const isLowStock = totalStock > 0 && totalStock <= 10;
        const isSoldOut = totalStock === 0 && sizes.length > 0;

        return `
            <div class="product-card${isNew ? ' new-product' : ''}${isSoldOut ? ' sold-out' : ''}">
                ${isNew ? '<span class="new-tag">NEW</span>' : ''}
                ${isSoldOut ? '<span class="stock-tag sold-out-tag">SOLD OUT</span>' : isLowStock ? `<span class="stock-tag low-stock-tag">${totalStock} LEFT</span>` : ''}
                <div class="product-image ${hasBackImage ? 'has-gallery' : ''}">
                    <button class="wishlist-heart${isWishlisted(product.id) ? ' active' : ''}"
                        data-product-id="${safeId}" aria-label="Add to wishlist" aria-pressed="${isWishlisted(product.id)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span class="like-count" style="${getLikeCount(product.id) > 0 ? '' : 'display:none'}">${getLikeCount(product.id)}</span>
                    </button>
                    <img src="${imgSrc}"
                         class="${imgClass}"
                         alt="${safeName}"
                         loading="lazy"
                         data-front="${safeImage}"
                         ${hasBackImage ? `data-back="${safeBack}"` : ''}
                         data-current="front"
                         >
                    ${hasBackImage ? `
                        <button class="gallery-arrow gallery-prev" aria-label="Previous image">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <button class="gallery-arrow gallery-next" aria-label="Next image">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                        <div class="gallery-dots">
                            <span class="gallery-dot active"></span>
                            <span class="gallery-dot"></span>
                        </div>
                    ` : ''}
                </div>
                <div class="product-footer">
                    <div class="product-info">
                        <h3>${safeName}</h3>
                    </div>
                    <div class="product-price-row">
                        <p>${formattedPrice}</p>
                        <div class="product-actions">
                            <button type="button" class="add-to-cart-btn"
                                data-id="${safeId}"
                                data-name="${safeName}"
                                data-price="${safePrice}"
                                data-image="${safeImage}"
                                data-stock="${safeStock}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                                Add to bag
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    productContainer.innerHTML = html;

    // Initialize gallery arrows
    initGalleryArrows();
    initBackImagePreload();
    initCardNavigation();
    initWishlistHearts();
}

function initCardNavigation() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn') || e.target.closest('.gallery-arrow') || e.target.closest('.card-size-picker') || e.target.closest('.wishlist-heart')) return;
            const id = card.querySelector('.add-to-cart-btn')?.dataset.id;
            if (id) window.location.href = `product.html?id=${id}`;
        });
    });
}

function initGalleryArrows() {
    const arrows = document.querySelectorAll('.gallery-arrow');

    arrows.forEach(arrow => {
        arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const imageContainer = arrow.closest('.product-image');
            const img = imageContainer.querySelector('img.product');
            const dots = imageContainer.querySelectorAll('.gallery-dot');

            const frontSrc = img.dataset.front;
            const backSrc = img.dataset.back;
            const current = img.dataset.current;

            if (current === 'front') {
                img.src = backSrc;
                img.dataset.current = 'back';
                dots[0].classList.remove('active');
                dots[1].classList.add('active');
            } else {
                img.src = frontSrc;
                img.dataset.current = 'front';
                dots[0].classList.add('active');
                dots[1].classList.remove('active');
            }
        });
    });
}

// Warm each product card's back-image into the browser cache as soon as the
// card scrolls near the viewport, so tapping the gallery arrow swaps to an
// already-downloaded image instead of a cold Supabase Storage round-trip.
// Low fetch priority means it doesn't compete with the visible front images.
function initBackImagePreload() {
    if (!('IntersectionObserver' in window)) return;
    const imgs = document.querySelectorAll('img.product[data-back]');
    if (!imgs.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const back = img.dataset.back;
            if (back) {
                const warmer = new Image();
                warmer.fetchPriority = 'low';
                warmer.decoding = 'async';
                warmer.src = back;
            }
            obs.unobserve(img);
        });
    }, { rootMargin: '200px 0px' });
    imgs.forEach((img) => obs.observe(img));
}

function initWishlistHearts() {
    document.querySelectorAll('.wishlist-heart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.productId;
            toggleWishlist(productId);
            // Pop animation
            btn.classList.add('heart-pop');
            btn.addEventListener('animationend', () => btn.classList.remove('heart-pop'), { once: true });
        });
    });
}
