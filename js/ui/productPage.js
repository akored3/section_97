// Product details page — handles fetch, render, sizes, descriptions, and cart
import { fetchProductById } from '../data/products.js';
import { initializeTheme } from '../ui/theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer, addToCart, openCartDrawer } from './cart.js';

let selectedSize = null;
let selectedSizeStock = null;
let currentProduct = null;

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
    const safePrice = Number(product.price).toLocaleString();
    const description = generateDescription(product);

    // Dynamic page title
    document.title = `${product.name} | SECTION-97`;

    // Main image with error fallback
    const mainImage = document.getElementById('pdp-main-image');
    mainImage.src = product.imageSrc;
    mainImage.alt = safeName;
    mainImage.onerror = () => {
        mainImage.onerror = null;
        mainImage.src = 'images/placeholder.png';
    };

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

    // Sizes from database
    const sizes = product.sizes || [];
    const sizesContainer = document.getElementById('pdp-sizes');
    const stockEl = document.getElementById('pdp-stock');
    const addBtn = document.getElementById('pdp-add-to-cart');

    if (sizes.length === 0) {
        sizesContainer.innerHTML = '<span class="pdp-no-sizes">Sizes unavailable</span>';
    } else {
        sizesContainer.innerHTML = sizes.map(s => {
            const outOfStock = s.stock <= 0;
            return `<button class="pdp-size-chip ${outOfStock ? 'out-of-stock' : ''}"
                data-size="${escapeHtml(s.size)}"
                data-stock="${s.stock}"
                ${outOfStock ? 'disabled' : ''}>
                ${escapeHtml(s.size)}
            </button>`;
        }).join('');
    }

    // Auto-select if single size (e.g., bags = ONE SIZE)
    if (sizes.length === 1 && sizes[0].stock > 0) {
        const chip = sizesContainer.querySelector('.pdp-size-chip');
        chip.classList.add('active');
        selectedSize = sizes[0].size;
        selectedSizeStock = sizes[0].stock;
        addBtn.disabled = false;
        addBtn.textContent = `ADD TO BAG — SIZE ${selectedSize}`;
    }

    // Size selection handlers
    sizesContainer.querySelectorAll('.pdp-size-chip:not([disabled])').forEach(chip => {
        chip.addEventListener('click', () => {
            sizesContainer.querySelectorAll('.pdp-size-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedSize = chip.dataset.size;
            selectedSizeStock = parseInt(chip.dataset.stock);

            addBtn.disabled = false;
            addBtn.textContent = `ADD TO BAG — SIZE ${selectedSize}`;

            // Update stock display for selected size
            stockEl.className = 'pdp-stock-info';
            if (selectedSizeStock <= 5 && selectedSizeStock > 0) {
                stockEl.textContent = `Only ${selectedSizeStock} left in size ${selectedSize}`;
                stockEl.classList.add('low-stock');
            } else {
                stockEl.textContent = '';
            }
        });
    });

    // Product-level out of stock (all sizes gone)
    const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);
    if (totalStock === 0) {
        stockEl.textContent = 'Out of stock';
        stockEl.classList.add('out-of-stock');
        addBtn.disabled = true;
        addBtn.textContent = 'SOLD OUT';
    }

    // Show content, hide skeleton, trigger entrance animation
    document.getElementById('pdp-skeleton').style.display = 'none';
    const content = document.getElementById('pdp-content');
    content.style.display = 'grid';
    content.classList.add('pdp-enter');
}

// Setup PDP add-to-cart button
function setupAddToCart() {
    const addBtn = document.getElementById('pdp-add-to-cart');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        if (!currentProduct || !selectedSize) return;

        addToCart({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.imageSrc,
            size: selectedSize
        });

        openCartDrawer();
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await initializeCart();
    setupCartDrawer();

    // Validate URL param before fetch
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) return showError();

    const product = await fetchProductById(parseInt(id));

    if (!product) return showError();

    currentProduct = product;
    renderProduct(product);
    setupAddToCart();
});
