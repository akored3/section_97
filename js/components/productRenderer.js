// Handles rendering products to the DOM

// Escape HTML to prevent XSS from dynamic data
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

export function showSkeletons(count = 8) {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) return;

    const html = Array.from({ length: count }, () => `
        <div class="product-card skeleton-card">
            <div class="product-image skeleton-image"></div>
            <div class="product-footer">
                <div class="product-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-price"></div>
                </div>
                <div class="product-actions">
                    <div class="skeleton-button"></div>
                </div>
            </div>
        </div>
    `).join('');

    productContainer.innerHTML = html;
}

export function renderProducts(productsToRender) {
    const productContainer = document.getElementById("product-container");

    if (!productContainer) {
        console.error('Product container not found');
        return;
    }

    const html = productsToRender.map((product, index) => {
        const hasBackImage = product.imageBack && product.imageBack !== null;

        const safeName = escapeHtml(product.name);
        const safePrice = escapeHtml(product.price);
        const safeId = escapeHtml(product.id);
        const safeImage = escapeHtml(product.imageSrc);
        const safeBack = hasBackImage ? escapeHtml(product.imageBack) : '';
        const formattedPrice = Number(product.price).toLocaleString();

        // First 6 products load immediately (above the fold), rest are lazy loaded
        const isAboveFold = index < 6;
        const imgClass = isAboveFold ? 'product loaded' : 'product lazy-load';
        const imgSrc = isAboveFold ? safeImage : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
        const dataSrc = isAboveFold ? '' : `data-src="${safeImage}"`;

        return `
            <div class="product-card">
                <div class="product-image ${hasBackImage ? 'has-gallery' : ''}">
                    <img src="${imgSrc}"
                         ${dataSrc}
                         class="${imgClass}"
                         alt="${safeName}"
                         loading="lazy"
                         data-front="${safeImage}"
                         ${hasBackImage ? `data-back="${safeBack}"` : ''}
                         data-current="front"
                         onerror="this.onerror=null;this.src='images/placeholder.png';">
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
                        <p>$${formattedPrice}</p>
                    </div>
                    <div class="product-actions">
                        <button type="button" class="add-to-cart-btn"
                            data-id="${safeId}"
                            data-name="${safeName}"
                            data-price="${safePrice}"
                            data-image="${safeImage}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            ADD TO BAG
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    productContainer.innerHTML = html;

    // Initialize gallery arrows
    initGalleryArrows();
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
