// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts } from './components/productRenderer.js';
import { initializeFilters, initializeSearch } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { getCurrentUser, onAuthStateChange, signOut } from './auth/auth.js';
import { initializeLazyLoading } from './ui/lazyLoad.js';
import { initializeCart, setupCartDrawer, setupAddToCartButtons, handleAuthChange, updateBadgeIfGuest } from './ui/cart.js';
import { initPageLoader } from './ui/progressBar.js';

// Track if user is logged in
let isLoggedIn = false;


// Default user SVG icon markup (used to restore when logged out)
const defaultUserSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><circle cx="32" cy="20" r="12"/><path d="M8 58C8 44 18 36 32 36C46 36 56 44 56 58"/><path d="M24 20H40" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.3"/></svg>`;

// Swap the SVG icon with the user's avatar photo (only if they have one)
function swapAuthIcon(el, user) {
    if (!el || !user.avatar) return;
    if (el.querySelector('.auth-avatar')) return;
    const svg = el.querySelector('svg');
    if (svg) {
        const img = document.createElement('img');
        img.className = 'auth-avatar';
        img.alt = `${user.username}'s avatar`;
        img.src = user.avatar;
        img.onerror = () => {
            img.onerror = null;
            const temp = document.createElement('template');
            temp.innerHTML = defaultUserSvg.trim();
            img.replaceWith(temp.content.firstChild);
        };
        svg.replaceWith(img);
    }
}

// Restore the default SVG icon when logged out
function restoreAuthIcon(el) {
    if (!el) return;
    const img = el.querySelector('.auth-avatar');
    if (img) {
        const temp = document.createElement('template');
        temp.innerHTML = defaultUserSvg.trim();
        img.replaceWith(temp.content.firstChild);
    }
}

// Update auth button based on login state (desktop + mobile)
async function updateAuthButton() {
    const authText = document.getElementById('auth-text');
    const authBtn = document.getElementById('auth-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    const user = await getCurrentUser();
    isLoggedIn = !!user;

    // Cache username + avatar in localStorage to prevent flash on next page load
    try {
        if (user && user.username) {
            localStorage.setItem('section97-username', user.username);
            if (user.avatar) {
                localStorage.setItem('section97-avatar', user.avatar);
            } else {
                localStorage.removeItem('section97-avatar');
            }
        } else {
            localStorage.removeItem('section97-username');
            localStorage.removeItem('section97-avatar');
        }
    } catch (e) { /* storage unavailable */ }

    // Desktop auth button
    if (authText && authBtn) {
        if (user) {
            authText.textContent = user.username || 'Account';
            authBtn.title = `Logged in as ${user.username}`;
            swapAuthIcon(authBtn, user);
        } else {
            authText.textContent = 'Login';
            authBtn.title = 'Login or Sign up';
            restoreAuthIcon(authBtn);
        }
    }

    // Mobile auth section
    const mobileUserInfo = document.getElementById('mobile-user-info');
    const mobileUsername = document.getElementById('mobile-username');

    if (mobileLoginBtn && mobileLogoutBtn) {
        if (user) {
            mobileLoginBtn.classList.add('hidden');
            if (mobileUserInfo) {
                mobileUserInfo.classList.remove('hidden');
                swapAuthIcon(mobileUserInfo, user);
            }
            if (mobileUsername) mobileUsername.textContent = user.username || 'Account';
            mobileLogoutBtn.classList.remove('hidden');
        } else {
            mobileLoginBtn.classList.remove('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
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
        authBtn.setAttribute('aria-expanded', 'false');

        // Toggle dropdown on click (if logged in) or redirect (if not)
        authBtn.addEventListener('click', () => {
            if (isLoggedIn) {
                const isOpen = dropdown.classList.toggle('active');
                authBtn.setAttribute('aria-expanded', isOpen);
            } else {
                window.location.href = 'auth.html';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.auth-wrapper')) {
                dropdown.classList.remove('active');
                authBtn.setAttribute('aria-expanded', 'false');
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
    // Start HUD progress bar animation
    const loader = initPageLoader('store-loader');

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
        else updateBadgeIfGuest();
    });

    // Products - core content
    let products = [];
    try {
        products = await fetchProducts(); // Already shuffled with new products pinned to top
        renderProducts(products);
        initializeLazyLoading();
        setupAddToCartButtons();
    } catch (e) {
        console.error('[Products] failed to load:', e);
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
    await safeInit('IdleTimeout', () => initializeIdleTimeout());

});
