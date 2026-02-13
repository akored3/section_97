// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts, showSkeletons } from './components/productRenderer.js';
import { initializeFilters, initializeSearch } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { initializeCart, setupAddToCartButtons, openCartDrawer, setupCartDrawer, handleAuthChange } from './ui/cart.js';
import { getCurrentUser, onAuthStateChange, signOut } from './auth/auth.js';
import { initializeLazyLoading } from './ui/lazyLoad.js';

// Track if user is logged in
let isLoggedIn = false;

// Update auth button based on login state (desktop + mobile)
async function updateAuthButton() {
    const authText = document.getElementById('auth-text');
    const authBtn = document.getElementById('auth-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    const user = await getCurrentUser();
    isLoggedIn = !!user;

    // Cache username in localStorage to prevent flash on next page load
    try {
        if (user && user.username) {
            localStorage.setItem('section97-username', user.username);
        } else {
            localStorage.removeItem('section97-username');
        }
    } catch (e) { /* storage unavailable */ }

    // Desktop auth button
    if (authText && authBtn) {
        if (user) {
            authText.textContent = user.username || 'Account';
            authBtn.title = `Logged in as ${user.username}`;
        } else {
            authText.textContent = 'Login';
            authBtn.title = 'Login or Sign up';
        }
    }

    // Mobile auth section
    const mobileUserInfo = document.getElementById('mobile-user-info');
    const mobileUsername = document.getElementById('mobile-username');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');

    if (mobileLoginBtn && mobileLogoutBtn) {
        if (user) {
            mobileLoginBtn.style.display = 'none';
            if (mobileUserInfo) mobileUserInfo.style.display = 'flex';
            if (mobileUsername) mobileUsername.textContent = user.username || 'Account';
            if (mobileProfileBtn) mobileProfileBtn.style.display = 'flex';
            mobileLogoutBtn.style.display = 'flex';
        } else {
            mobileLoginBtn.style.display = 'flex';
            if (mobileUserInfo) mobileUserInfo.style.display = 'none';
            if (mobileProfileBtn) mobileProfileBtn.style.display = 'none';
            mobileLogoutBtn.style.display = 'none';
        }
    }
}

// Initialize auth dropdown behavior (desktop + mobile)
function initializeAuthDropdown() {
    const authBtn = document.getElementById('auth-btn');
    const dropdown = document.getElementById('auth-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Desktop dropdown
    if (authBtn && dropdown) {
        // Toggle dropdown on click (if logged in) or redirect (if not)
        authBtn.addEventListener('click', () => {
            if (isLoggedIn) {
                dropdown.classList.toggle('active');
            } else {
                window.location.href = 'auth.html';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.auth-wrapper')) {
                dropdown.classList.remove('active');
            }
        });
    }

    // Desktop logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await signOut();
            if (result.success) {
                dropdown.classList.remove('active');
                await handleAuthChange(null);
                updateAuthButton();
            }
        });
    }

    // Mobile logout handler
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async () => {
            const result = await signOut();
            if (result.success) {
                if (mobileMenu) mobileMenu.classList.remove('active');
                await handleAuthChange(null);
                updateAuthButton();
            }
        });
    }
}

// Session idle timeout - logs out after 30 minutes of inactivity
function initializeIdleTimeout() {
    const IDLE_LIMIT = 30 * 60 * 1000; // 30 minutes
    let idleTimer;

    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
            if (isLoggedIn) {
                await signOut();
                await handleAuthChange(null);
                window.location.href = 'auth.html';
            }
        }, IDLE_LIMIT);
    }

    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();
}

// Safe wrapper - logs error but doesn't kill the page
async function safeInit(name, fn) {
    try {
        await fn();
    } catch (e) {
        console.error(`[${name}] failed to initialize:`, e);
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Show skeleton cards immediately for better UX
    showSkeletons(8);

    // Cart and auth are critical - initialize first
    await safeInit('Cart', async () => {
        await initializeCart();
        setupCartDrawer();
        const cartBtn = document.querySelector('.cart-btn');
        if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
    });

    await safeInit('Auth', async () => {
        updateAuthButton();
        initializeAuthDropdown();
        onAuthStateChange(() => updateAuthButton());
    });

    // Products - core content
    let products = [];
    await safeInit('Products', async () => {
        products = await fetchProducts();
        renderProducts(products);
        initializeLazyLoading();
        setupAddToCartButtons();
    });

    // UI features - non-critical
    await safeInit('Filters', () => {
        initializeFilters(products);
        initializeSearch();
    });
    await safeInit('Theme', () => initializeTheme());
    await safeInit('Menu', () => initializeMenu());
    await safeInit('IdleTimeout', () => initializeIdleTimeout());

    console.log('SECTION-97 initialized ✓');
});
