// Main entry point - coordinates all modules
import { products } from './data/products.js';
import { renderProducts } from './components/productRenderer.js';
import { initializeFilters } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Render all products initially
    renderProducts(products);

    // Initialize all components
    initializeFilters();
    initializeTheme();
    initializeMenu();

    console.log('SECTION-97 initialized ✓');
});
