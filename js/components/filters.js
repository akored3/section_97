// Handles product filtering logic
import { renderProducts } from './productRenderer.js';
import { setupAddToCartButtons } from '../ui/cart.js';

let currentFilter = 'all';
let allProducts = [];

export function filterProducts(category) {
    currentFilter = category;

    let filteredProducts;
    if (category === 'all') {
        filteredProducts = allProducts;
    } else {
        filteredProducts = allProducts.filter(product => product.category === category);
    }

    renderProducts(filteredProducts);
    setupAddToCartButtons();
    updateActiveButton(category);
    closeMobileMenu();
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
