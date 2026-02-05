// Handles product filtering and search logic
import { renderProducts } from './productRenderer.js';
import { setupAddToCartButtons } from '../ui/cart.js';

let currentFilter = 'all';
let currentSearchTerm = '';
let allProducts = [];

// Apply both category filter and search term
function applyFilters() {
    let filteredProducts = allProducts;

    // Apply category filter
    if (currentFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === currentFilter);
    }

    // Apply search filter
    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product => {
            const name = product.name.toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            return name.includes(term) || brand.includes(term);
        });
    }

    // Show no results message if empty
    if (filteredProducts.length === 0) {
        renderNoResults();
    } else {
        renderProducts(filteredProducts);
        setupAddToCartButtons();
    }
}

function renderNoResults() {
    const container = document.getElementById('product-container');
    if (container) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No products found.</h3>
                <p>Try a different search or category.</p>
            </div>
        `;
    }
}

export function filterProducts(category) {
    currentFilter = category;
    applyFilters();
    updateActiveButton(category);
    closeMobileMenu();
}

export function searchProducts(term) {
    currentSearchTerm = term.trim();
    applyFilters();
}

function updateActiveButton(category) {
    const allFilterBtns = document.querySelectorAll('.filter-btn');
    allFilterBtns.forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
    }
}

export function initializeFilters(products) {
    allProducts = products;

    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterProducts(category);
        });
    });

    // Set 'All' button as active on load
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
    }
}

export function getCurrentFilter() {
    return currentFilter;
}

export function clearSearch() {
    currentSearchTerm = '';
    applyFilters();
}

export function initializeSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');
    const mobileSearchInput = document.getElementById('mobile-search-input');

    // Toggle search bar expansion
    if (searchToggle && searchContainer) {
        searchToggle.addEventListener('click', () => {
            searchContainer.classList.add('expanded');
            searchToggle.classList.add('hidden');
            setTimeout(() => searchInput?.focus(), 100);
        });
    }

    // Close search bar
    if (searchClose && searchContainer) {
        searchClose.addEventListener('click', () => {
            searchContainer.classList.remove('expanded');
            searchToggle?.classList.remove('hidden');
            if (searchInput) {
                searchInput.value = '';
                searchProducts('');
                if (mobileSearchInput) mobileSearchInput.value = '';
            }
        });
    }

    // Close on Escape key
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchClose?.click();
            }
        });
    }

    // Desktop search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value;
            searchProducts(term);
            if (mobileSearchInput) mobileSearchInput.value = term;
        });
    }

    // Mobile search input
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', (e) => {
            const term = e.target.value;
            searchProducts(term);
            if (searchInput) searchInput.value = term;
        });
    }

    // Close search when clicking outside
    document.addEventListener('click', (e) => {
        if (searchContainer?.classList.contains('expanded')) {
            const isClickInside = e.target.closest('.search-wrapper');
            if (!isClickInside) {
                searchClose?.click();
            }
        }
    });
}
