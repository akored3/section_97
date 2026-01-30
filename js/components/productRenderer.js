// Handles rendering products to the DOM

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
                    <img src="${productsToRender[i].imageSrc}" class="product" alt="${productsToRender[i].name}">
                </div>
                <div class="product-footer">
                    <div class="product-info">
                        <h3>${productsToRender[i].name}</h3>
                        <p>$${productsToRender[i].price}</p>
                    </div>
                    <div class="product-actions">
                        <button type="button">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    }

    productContainer.innerHTML = html;
}
