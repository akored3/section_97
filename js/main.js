// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts, showSkeletons } from './components/productRenderer.js';
import { initializeFilters, initializeSearch } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { getCurrentUser, onAuthStateChange, signOut } from './auth/auth.js';
import { initializeLazyLoading } from './ui/lazyLoad.js';
import { initializeCart, setupCartDrawer, setupAddToCartButtons, handleAuthChange } from './ui/cart.js';

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
            mobileLoginBtn.classList.add('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.remove('hidden');
            if (mobileUsername) mobileUsername.textContent = user.username || 'Account';
            if (mobileProfileBtn) mobileProfileBtn.classList.remove('hidden');
            mobileLogoutBtn.classList.remove('hidden');
        } else {
            mobileLoginBtn.classList.remove('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
            if (mobileProfileBtn) mobileProfileBtn.classList.add('hidden');
            mobileLogoutBtn.classList.add('hidden');
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
                updateAuthButton();
                handleAuthChange(null);
            }
        });
    }

    // Mobile logout handler
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async () => {
            const result = await signOut();
            if (result.success) {
                if (mobileMenu) mobileMenu.classList.remove('active');
                updateAuthButton();
                handleAuthChange(null);
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
                handleAuthChange(null);
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

    await safeInit('Cart', async () => {
        await initializeCart();
        setupCartDrawer();
    });

    await safeInit('Auth', async () => {
        updateAuthButton();
        initializeAuthDropdown();
        onAuthStateChange((event, session) => {
            updateAuthButton();
            handleAuthChange(session?.user?.id || null);
        });
        // Initial auth-aware cart load
        const user = await getCurrentUser();
        if (user) await handleAuthChange(user.id);
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
