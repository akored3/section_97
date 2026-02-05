// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts, showSkeletons } from './components/productRenderer.js';
import { initializeFilters } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { initializeCart, setupAddToCartButtons, openCartDrawer, setupCartDrawer, handleAuthChange } from './ui/cart.js';
import { getCurrentUser, onAuthStateChange, signOut } from './auth/auth.js';

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

    if (mobileLoginBtn && mobileLogoutBtn) {
        if (user) {
            mobileLoginBtn.style.display = 'none';
            if (mobileUserInfo) mobileUserInfo.style.display = 'flex';
            if (mobileUsername) mobileUsername.textContent = user.username || 'Account';
            mobileLogoutBtn.style.display = 'flex';
        } else {
            mobileLoginBtn.style.display = 'flex';
            if (mobileUserInfo) mobileUserInfo.style.display = 'none';
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

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize cart (must await to properly sync with Supabase)
    await initializeCart();

    // Set up cart drawer
    setupCartDrawer();
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);

    // Check auth state and update button
    updateAuthButton();

    // Initialize auth dropdown
    initializeAuthDropdown();

    // Listen for auth changes
    onAuthStateChange(() => {
        updateAuthButton();
    });

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
