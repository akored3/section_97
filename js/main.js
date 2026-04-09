// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts } from './components/productRenderer.js';
import { initializeFilters, initializeSearch } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { getCurrentUser, onAuthStateChange } from './auth/auth.js';
import { updateAuthButton, initializeAuthDropdown, isUserLoggedIn } from './auth/authUI.js';
import { initializeIdleTimeout } from './auth/idleTimeout.js';
import { initializeLazyLoading } from './ui/lazyLoad.js';
import { initializeCart, setupCartDrawer, setupAddToCartButtons, handleAuthChange, updateBadgeIfGuest } from './ui/cart.js';
import { initPageLoader } from './ui/progressBar.js';
import { initializeWishlist, handleWishlistAuth, setupWishlistDrawer, setProductsCache, fetchLikeCounts } from './ui/wishlist.js';
import { initScrollSnap } from './ui/scrollSnap.js';
import { initializeCurrency } from './config/currency.js';
import { injectCardRatings } from './ui/reviews.js';
import { initializeRankUpFAB } from './ui/rankUpFAB.js';

import './ui/imgFallback.js';

// Safe wrapper - logs error but doesn't kill the page
async function safeInit(name, fn) {
    try {
        await fn();
    } catch (e) {
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Start HUD progress bar animation
    const loader = initPageLoader('store-loader');

    // Detect user currency before rendering prices
    await initializeCurrency();

    await safeInit('Cart', async () => {
        await initializeCart();
        await initializeWishlist();
        setupCartDrawer();
        setupWishlistDrawer();
    });

    await safeInit('Auth', async () => {
        updateAuthButton();
        initializeAuthDropdown({
            onLogout: () => handleAuthChange(null)
        });
        onAuthStateChange((event, session) => {
            updateAuthButton();
            handleAuthChange(session?.user?.id || null);
            handleWishlistAuth(session?.user?.id || null);
        });
        // Initial auth-aware cart + wishlist load
        const user = await getCurrentUser();
        if (user) {
            await handleAuthChange(user.id);
            await handleWishlistAuth(user.id);
        } else {
            updateBadgeIfGuest();
        }
    });

    // Products - core content
    let products = [];
    try {
        products = await fetchProducts(); // Already shuffled with new products pinned to top
        renderProducts(products);
        setProductsCache(products);
        initializeLazyLoading();
        setupAddToCartButtons();
        fetchLikeCounts(); // Fire-and-forget — updates counts when ready
        initScrollSnap(); // JS-based snap on idle (replaces CSS scroll-snap)
        injectCardRatings(products.map(p => p.id)); // Non-blocking star ratings on cards
    } catch (e) {
        const container = document.getElementById('product-container');
        if (container) {
            container.innerHTML = `
                <div class="store-error-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>FAILED TO LOAD PRODUCTS</p>
                    <span>Check your connection and refresh the page</span>
                </div>`;
        }
    } finally {
        if (loader) loader.complete();
    }

    // UI features - non-critical
    await safeInit('Filters', () => {
        initializeFilters(products);
        initializeSearch();
    });
    await safeInit('Theme', () => initializeTheme());
    await safeInit('Menu', () => initializeMenu());
    await safeInit('IdleTimeout', () => initializeIdleTimeout(isUserLoggedIn, () => handleAuthChange(null)));
    await safeInit('RankUp', () => initializeRankUpFAB());
});
