// Main entry point - coordinates all modules
import { fetchProducts } from './data/products.js';
import { renderProducts, showSkeletons } from './components/productRenderer.js';
import { initializeFilters } from './components/filters.js';
import { initializeTheme } from './ui/theme.js';
import { initializeMenu } from './ui/menu.js';
import { initializeCart, setupAddToCartButtons, openCartDrawer, setupCartDrawer } from './ui/cart.js';
import { getCurrentUser, onAuthStateChange, signOut } from './auth/auth.js';

// Track if user is logged in
let isLoggedIn = false;

// Update auth button based on login state
async function updateAuthButton() {
    const authText = document.getElementById('auth-text');
    const authBtn = document.getElementById('auth-btn');

    if (!authText || !authBtn) return;

    const user = await getCurrentUser();
    isLoggedIn = !!user;

    if (user) {
        authText.textContent = user.username || 'Account';
        authBtn.title = `Logged in as ${user.username}`;
    } else {
        authText.textContent = 'Login';
        authBtn.title = 'Login or Sign up';
    }
}

// Initialize auth dropdown behavior
function initializeAuthDropdown() {
    const authBtn = document.getElementById('auth-btn');
    const dropdown = document.getElementById('auth-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (!authBtn || !dropdown) return;

    // Toggle dropdown on click (if logged in) or redirect (if not)
    authBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            dropdown.classList.toggle('active');
        } else {
            window.location.href = 'auth.html';
        }
    });

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await signOut();
            if (result.success) {
                dropdown.classList.remove('active');
                updateAuthButton();
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.auth-wrapper')) {
            dropdown.classList.remove('active');
        }
    });
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
