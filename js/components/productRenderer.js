// Handles rendering products to the DOM

export function showSkeletons(count = 8) {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) return;

    let html = "";
    for (let i = 0; i < count; i++) {
        html += `
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
        `;
    }
    productContainer.innerHTML = html;
}

export function renderProducts(productsToRender) {
    const productContainer = document.getElementById("product-container");

    if (!productContainer) {
        console.error('Product container not found');
        return;
    }

    let html = "";

    for (let i = 0; i < productsToRender.length; i++) {
        const product = productsToRender[i];
        const hasBackImage = product.imageBack && product.imageBack !== null;

        html += `
            <div class="product-card">
                <div class="product-image ${hasBackImage ? 'has-gallery' : ''}">
                    <img src="${product.imageSrc}"
                         class="product"
                         alt="${product.name}"
                         loading="lazy"
                         data-front="${product.imageSrc}"
                         ${hasBackImage ? `data-back="${product.imageBack}"` : ''}
                         data-current="front">
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
                        <h3>${product.name}</h3>
                        <p>$${product.price}</p>
                    </div>
                    <div class="product-actions">
                        <button type="button" class="add-to-cart-btn"
                            data-id="${product.id}"
                            data-name="${product.name}"
                            data-price="${product.price}"
                            data-image="${product.imageSrc}">
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
    }

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
