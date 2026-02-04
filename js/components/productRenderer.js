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
        html += `
            <div class="product-card">
                <div class="product-image">
                    <img src="${productsToRender[i].imageSrc}" class="product" alt="${productsToRender[i].name}" loading="lazy">
                </div>
                <div class="product-footer">
                    <div class="product-info">
                        <h3>${productsToRender[i].name}</h3>
                        <p>$${productsToRender[i].price}</p>
                    </div>
                    <div class="product-actions">
                        <button type="button" class="add-to-cart-btn"
                            data-id="${productsToRender[i].id}"
                            data-name="${productsToRender[i].name}"
                            data-price="${productsToRender[i].price}"
                            data-image="${productsToRender[i].imageSrc}">
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
}
