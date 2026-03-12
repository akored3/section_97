// Product details page — handles fetch, render, sizes, descriptions, and cart
import { fetchProductById } from '../data/products.js';
import { initializeTheme } from '../ui/theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer, addToCart, openCartDrawer, handleAuthChange, updateBadgeIfGuest, getCart } from './cart.js';
import { getCurrentUser } from '../auth/auth.js';

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
    document.getElementById('pdp-skeleton').classList.add('hidden');
    document.getElementById('pdp-content').classList.add('hidden');
    const error = document.getElementById('pdp-error');
    error.classList.remove('hidden');
    error.style.display = 'flex';
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
    document.getElementById('pdp-price').textContent = `₦${safePrice}`;
    document.getElementById('pdp-description').textContent = description;

    // Sizes from database
    const sizes = product.sizes || [];
    const sizesContainer = document.getElementById('pdp-sizes');
    const stockEl = document.getElementById('pdp-stock');
    const addBtn = document.getElementById('pdp-add-to-cart');

    if (sizes.length === 0) {
        sizesContainer.innerHTML = '<span class="pdp-no-sizes">Sizes unavailable</span>';
    } else {
        renderPdpChips(product, sizes, sizesContainer, stockEl, addBtn);
    }

    // Show content, hide skeleton, trigger entrance animation
    document.getElementById('pdp-skeleton').classList.add('hidden');
    const content = document.getElementById('pdp-content');
    content.classList.remove('hidden');
    content.classList.add('pdp-enter');
}

// Render/refresh PDP size chips with remaining stock (db stock - cart qty)
function renderPdpChips(product, sizes, sizesContainer, stockEl, addBtn) {
    const cartItems = getCart();

    // Filter to only sizes with remaining stock
    const available = sizes.filter(s => {
        const cartItem = cartItems.find(i => String(i.id) === String(product.id) && i.size === s.size);
        return s.stock - (cartItem ? cartItem.quantity : 0) > 0;
    });

    if (available.length === 0) {
        sizesContainer.innerHTML = '';
        stockEl.textContent = 'Out of stock';
        stockEl.className = 'pdp-stock-info out-of-stock';
        addBtn.disabled = true;
        addBtn.textContent = 'SOLD OUT';
        selectedSize = null;
        selectedSizeStock = null;
        return;
    }

    sizesContainer.innerHTML = available.map(s => {
        const cartItem = cartItems.find(i => String(i.id) === String(product.id) && i.size === s.size);
        const remaining = s.stock - (cartItem ? cartItem.quantity : 0);
        const low = remaining <= 5;
        const cls = low ? 'low-stock' : '';
        const stockLabel = low ? `data-stock-label="${remaining} LEFT"` : '';
        return `<button class="pdp-size-chip ${cls}"
            data-size="${escapeHtml(s.size)}"
            data-stock="${s.stock}"
            data-remaining="${remaining}"
            ${stockLabel}>
            ${escapeHtml(s.size)}
        </button>`;
    }).join('');

    // Auto-select if single available size
    if (available.length === 1) {
        const chip = sizesContainer.querySelector('.pdp-size-chip');
        chip.classList.add('active');
        selectedSize = available[0].size;
        selectedSizeStock = available[0].stock;
        addBtn.disabled = false;
        addBtn.textContent = `Add to bag — Size ${selectedSize}`;
    }

    // Re-select the previously selected size if still available
    if (selectedSize && available.length > 1) {
        const activeChip = sizesContainer.querySelector(`.pdp-size-chip[data-size="${CSS.escape(selectedSize)}"]`);
        if (activeChip) {
            activeChip.classList.add('active');
            selectedSizeStock = parseInt(activeChip.dataset.stock);
            addBtn.disabled = false;
            addBtn.textContent = `Add to bag — Size ${selectedSize}`;
        } else {
            selectedSize = null;
            selectedSizeStock = null;
            addBtn.disabled = true;
            addBtn.textContent = 'Select a size';
        }
    }

    // Size selection handlers
    sizesContainer.querySelectorAll('.pdp-size-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            sizesContainer.querySelectorAll('.pdp-size-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedSize = chip.dataset.size;
            selectedSizeStock = parseInt(chip.dataset.stock);
            const remaining = parseInt(chip.dataset.remaining);

            addBtn.disabled = false;
            addBtn.textContent = `Add to bag — Size ${selectedSize}`;

            // Update stock display for selected size
            stockEl.className = 'pdp-stock-info';
            if (remaining <= 5) {
                stockEl.textContent = `Only ${remaining} left in size ${selectedSize}`;
                stockEl.classList.add('low-stock');
            } else {
                stockEl.textContent = '';
            }
        });
    });
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
            size: selectedSize,
            stock: selectedSizeStock
        });

        // Refresh chips to reflect updated remaining stock
        const sizes = currentProduct.sizes || [];
        const sizesContainer = document.getElementById('pdp-sizes');
        const stockEl = document.getElementById('pdp-stock');
        renderPdpChips(currentProduct, sizes, sizesContainer, stockEl, addBtn);

        openCartDrawer();
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await initializeCart();
    setupCartDrawer();

    // Auth-aware cart sync
    const user = await getCurrentUser();
    if (user) await handleAuthChange(user.id);
    else updateBadgeIfGuest();

    // Validate URL param before fetch (strict numeric check)
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id || !/^\d+$/.test(id) || parseInt(id, 10) < 1) return showError();

    const product = await fetchProductById(parseInt(id, 10));

    if (!product) return showError();

    currentProduct = product;
    renderProduct(product);
    setupAddToCart();
});
