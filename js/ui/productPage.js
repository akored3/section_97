// Product details page — handles fetch, render, sizes, descriptions, and cart
import { fetchProductById } from '../data/products.js';
import { initializeTheme } from '../ui/theme.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, setupCartDrawer, addToCart, openCartDrawer, handleAuthChange, updateBadgeIfGuest, getCart } from './cart.js';
import { getCurrentUser } from '../auth/auth.js';

let selectedSize = null;
let selectedSizeStock = null;
let currentProduct = null;

// Rotating fonts for the product title — class names match CSS definitions
const TITLE_FONT_CLASSES = [
    'font-bebas-neue', 'font-teko', 'font-oswald', 'font-anton',
    'font-saira-condensed', 'font-barlow-condensed', 'font-fjalla-one',
    'font-russo-one', 'font-black-ops-one', 'font-staatliches',
    'font-quantico', 'font-turret-road', 'font-orbitron', 'font-audiowide',
    'font-righteous', 'font-oxanium', 'font-michroma', 'font-electrolize',
    'font-exo-2', 'font-play', 'font-chakra-petch', 'font-jura',
    'font-montserrat', 'font-work-sans', 'font-space-grotesk',
    'font-bruno-ace', 'font-iceberg', 'font-permanent-marker',
    'font-bungee', 'font-fugaz-one', 'font-alfa-slab-one',
    'font-racing-sans-one', 'font-share-tech-mono', 'font-roboto-mono',
    'font-jetbrains-mono', 'font-ibm-plex-mono', 'font-space-mono',
    'font-vt323', 'font-azeret-mono', 'font-rajdhani'
];

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

    // Cart/auth init is non-critical — don't let failures block product render
    try {
        await initializeCart();
        setupCartDrawer();
        const user = await getCurrentUser();
        if (user) await handleAuthChange(user.id);
        else updateBadgeIfGuest();
    } catch (e) {
        console.error('[PDP] Cart/auth init failed:', e);
    }

    // Validate URL param before fetch (strict numeric check)
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id || !/^\d+$/.test(id) || parseInt(id, 10) < 1) return showError();

    const product = await fetchProductById(parseInt(id, 10));

    if (!product) return showError();

    currentProduct = product;
    renderProduct(product);
    setupAddToCart();
    startTitleFontRotation();
});

// Cycle through fonts on the product title every 5 seconds
function startTitleFontRotation() {
    const titleEl = document.getElementById('pdp-name');
    if (!titleEl) {
        console.error('[FONT ROTATE] pdp-name element not found!');
        return;
    }
    console.log('[FONT ROTATE] Starting rotation on:', titleEl.textContent);
    console.log('[FONT ROTATE] Current computed font:', getComputedStyle(titleEl).fontFamily);

    let fontIndex = 0;
    let currentClass = '';

    setInterval(() => {
        fontIndex = (fontIndex + 1) % TITLE_FONT_CLASSES.length;
        const nextClass = TITLE_FONT_CLASSES[fontIndex];
        console.log(`[FONT ROTATE] Switching to: ${nextClass}`);

        titleEl.style.opacity = '0';
        setTimeout(() => {
            if (currentClass) titleEl.classList.remove(currentClass);
            currentClass = nextClass;
            titleEl.classList.add(currentClass);
            titleEl.style.opacity = '1';
            console.log(`[FONT ROTATE] Applied. Computed font now:`, getComputedStyle(titleEl).fontFamily);
        }, 300);
    }, 5000);
}
