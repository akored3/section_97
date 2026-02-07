// Product details page — handles fetch, render, sizes, descriptions, and cart
import { fetchProductById } from '../data/products.js';
import { addToCart, initializeCart, setupCartDrawer, openCartDrawer } from '../ui/cart.js';
import { initializeTheme } from '../ui/theme.js';
import { escapeHtml } from '../components/productRenderer.js';

let selectedSize = null;
let currentProduct = null;

// Size options by product category
function getSizesForCategory(category) {
    switch (category) {
        case 'hoodies':
        case 'jackets':
        case 'tshirts':
            return ['S', 'M', 'L', 'XL', 'XXL'];
        case 'pants':
            return ['28', '30', '32', '34', '36'];
        case 'shoes':
            return ['7', '8', '9', '10', '11', '12'];
        case 'bags':
            return ['ONE SIZE'];
        default:
            return ['S', 'M', 'L', 'XL'];
    }
}

// Generate description from product name, brand, and category
function generateDescription(product) {
    const templates = {
        hoodies: `Premium ${product.name} built for the streets. Heavyweight construction with signature ${product.brand} detailing. Oversized fit, ribbed cuffs, kangaroo pocket.`,
        tshirts: `The ${product.name} — essential streetwear from ${product.brand}. 100% premium cotton, relaxed fit, screen-printed graphics.`,
        jackets: `${product.name} by ${product.brand}. Weather-resistant shell with bold branding. Full zip, adjustable cuffs, inner pocket.`,
        pants: `${product.name} from ${product.brand}. Tapered silhouette, reinforced stitching, elastic waistband with drawcord.`,
        shoes: `${product.name} — ${product.brand} footwear. Cushioned insole, durable rubber outsole, premium materials throughout.`,
        bags: `${product.name} by ${product.brand}. Spacious main compartment, padded straps, water-resistant fabric.`,
    };
    return templates[product.category] || `${product.name} by ${product.brand}. Premium quality, exclusive design.`;
}

function showError() {
    document.getElementById('pdp-skeleton').style.display = 'none';
    document.getElementById('pdp-content').style.display = 'none';
    document.getElementById('pdp-error').style.display = 'flex';
}

function renderProduct(product) {
    const safeName = escapeHtml(product.name);
    const safeBrand = escapeHtml(product.brand || '');
    const safePrice = Number(product.price).toLocaleString();
    const description = generateDescription(product);

    // Main image
    const mainImage = document.getElementById('pdp-main-image');
    mainImage.src = product.imageSrc;
    mainImage.alt = safeName;

    // Thumbnails (front + back if available)
    const thumbContainer = document.getElementById('pdp-thumbnails');
    let thumbsHtml = `<img src="${escapeHtml(product.imageSrc)}" alt="${safeName} front" class="pdp-thumb active" data-src="${escapeHtml(product.imageSrc)}">`;
    if (product.imageBack) {
        thumbsHtml += `<img src="${escapeHtml(product.imageBack)}" alt="${safeName} back" class="pdp-thumb" data-src="${escapeHtml(product.imageBack)}">`;
    }
    thumbContainer.innerHTML = thumbsHtml;

    // Thumbnail click handlers
    thumbContainer.querySelectorAll('.pdp-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            mainImage.src = thumb.dataset.src;
            thumbContainer.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    // Product info
    document.getElementById('pdp-brand').textContent = product.brand || '';
    document.getElementById('pdp-name').textContent = product.name;
    document.getElementById('pdp-price').textContent = `$${safePrice}`;
    document.getElementById('pdp-description').textContent = description;

    // Sizes
    const sizes = getSizesForCategory(product.category);
    const sizesContainer = document.getElementById('pdp-sizes');
    sizesContainer.innerHTML = sizes.map(size =>
        `<button class="pdp-size-chip" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`
    ).join('');

    // Size selection handlers
    sizesContainer.querySelectorAll('.pdp-size-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            sizesContainer.querySelectorAll('.pdp-size-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedSize = chip.dataset.size;

            const addBtn = document.getElementById('pdp-add-to-cart');
            addBtn.disabled = false;
            addBtn.textContent = `ADD TO BAG — SIZE ${selectedSize}`;
        });
    });

    // Stock info
    const stockEl = document.getElementById('pdp-stock');
    if (product.stock !== undefined && product.stock !== null) {
        if (product.stock <= 5 && product.stock > 0) {
            stockEl.textContent = `Only ${product.stock} left in stock`;
            stockEl.classList.add('low-stock');
        } else if (product.stock === 0) {
            stockEl.textContent = 'Out of stock';
            stockEl.classList.add('out-of-stock');
            document.getElementById('pdp-add-to-cart').disabled = true;
            document.getElementById('pdp-add-to-cart').textContent = 'SOLD OUT';
        }
    }

    // Show content, hide skeleton
    document.getElementById('pdp-skeleton').style.display = 'none';
    document.getElementById('pdp-content').style.display = 'grid';
}

// Add to cart handler
function setupAddToCart() {
    const btn = document.getElementById('pdp-add-to-cart');
    btn.addEventListener('click', () => {
        if (!selectedSize || !currentProduct) return;

        addToCart({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.imageSrc
        });

        btn.textContent = 'ADDED TO BAG ✓';
        btn.disabled = true;
        openCartDrawer();

        setTimeout(() => {
            btn.textContent = `ADD TO BAG — SIZE ${selectedSize}`;
            btn.disabled = false;
        }, 1500);
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await initializeCart();
    setupCartDrawer();
    setupAddToCart();

    // Get product ID from URL
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return showError();

    const product = await fetchProductById(parseInt(id));
    if (!product) return showError();

    currentProduct = product;
    renderProduct(product);
});
