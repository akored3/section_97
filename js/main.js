// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts, showSkeletons } from './components/productRenderer.js';
import { initializeFilters } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { initializeCart, setupAddToCartButtons } from './ui/cart.js';

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize cart (loads from localStorage)
    initializeCart();

    // Show skeleton cards while loading
    showSkeletons(8);

    // Fetch products from JSON (simulates API call)
    const products = await fetchProducts();

    // Replace skeletons with real products
    renderProducts(products);

    // Set up cart buttons after products render
    setupAddToCartButtons();

    // Initialize all components
    initializeFilters(products);
    initializeTheme();
    initializeMenu();

    console.log('SECTION-97 initialized ✓');
});
