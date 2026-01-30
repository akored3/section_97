const products = [
    { id: 1, name: 'Awesome Hoodie', price: 1000, imageSrc: 'images/hoodie.jpeg', category: 'hoodies' },
    { id: 2, name: 'Cool Pants', price: 1200, imageSrc: 'images/pants.jpeg', category: 'pants' },
    // { id: 3, name: 'Balenciaga NBA', price: 1500, imageSrc: 'images/balenciaga_nba.jpeg' },
    { id: 4, name: 'Balenciaga NBA 25', price: 1500, imageSrc: 'images/balenciaga_nba25.jpeg', category: 'tshirts' },
    { id: 5, name: 'Balenciaga NBA 26', price: 1500, imageSrc: 'images/balenciaga_nba26.jpeg', category: 'tshirts' },
    { id: 6, name: 'Balenciaga NBA 27', price: 1500, imageSrc: 'images/balenciaga_nba27.jpeg', category: 'tshirts' },
    { id: 7, name: 'Balenciaga NBA 28', price: 1500, imageSrc: 'images/balenciaga_nba28.jpeg', category: 'tshirts' },
    { id: 8, name: 'Balenciaga NBA 31', price: 1500, imageSrc: 'images/balenciaga_nba31.jpeg', category: 'tshirts' },
    { id: 9, name: 'Balenciaga NBA Backpack', price: 2000, imageSrc: 'images/balenciaga_nba_backpack30.jpeg', category: 'other' },
    { id: 10, name: 'Balenciaga NBA Jacket', price: 2500, imageSrc: 'images/balenciaga_nba_jacket_32.jpeg', category: 'hoodies' },
    { id: 11, name: 'Balenciaga NBA Slides', price: 800, imageSrc: 'images/balenciaga_nba_slides29.jpeg', category: 'other' },
    { id: 12, name: 'Corteiz Denim Jacket', price: 2200, imageSrc: 'images/corteiz_denimjacket19.jpeg', category: 'hoodies' },
    { id: 13, name: 'Corteiz Denim Pants', price: 1500, imageSrc: 'images/corteiz_denim_pants15.jpeg', category: 'pants' },
    { id: 14, name: 'Corteiz Hoodie', price: 1200, imageSrc: 'images/corteiz_hoodie16.jpeg', category: 'hoodies' },
    { id: 15, name: 'Corteiz Hoodie 17', price: 1200, imageSrc: 'images/corteiz_hoodie17.jpeg', category: 'hoodies' },
    { id: 16, name: 'Corteiz Hoodie 22', price: 1200, imageSrc: 'images/corteiz_hoodie22.jpeg', category: 'hoodies' },
    { id: 17, name: 'Corteiz Hoodie 24', price: 1200, imageSrc: 'images/corteiz_hoodie24.jpeg', category: 'hoodies' },
    { id: 18, name: 'Corteiz Jacket', price: 2200, imageSrc: 'images/corteiz_jacket23.jpeg', category: 'hoodies' },
    { id: 19, name: 'Corteiz Pants', price: 1500, imageSrc: 'images/corteiz_pants14.jpeg', category: 'pants' },
    { id: 20, name: 'Corteiz Shirt', price: 900, imageSrc: 'images/corteiz_shirt20.jpeg', category: 'tshirts' },
    { id: 21, name: 'Corteiz Sweatpants', price: 1300, imageSrc: 'images/corteiz_sweatpants18.jpeg', category: 'pants' },
    { id: 22, name: 'Corteiz Sweatpants 21', price: 1300, imageSrc: 'images/corteiz_sweatpants21.jpeg', category: 'pants' },
    // { id: 23, name: 'Nike Logo', price: 600, imageSrc: 'images/nike_logo.jpeg' },
    // { id: 24, name: 'Nike Logo 1', price: 600, imageSrc: 'images/nike_logo1.jpeg' },
    // { id: 25, name: 'Red Model', price: 1100, imageSrc: 'images/red_model.jpeg' },
    { id: 26, name: 'Supreme Board', price: 1400, imageSrc: 'images/supreme_board12.jpeg', category: 'other' },
    { id: 27, name: 'Supreme Caps', price: 550, imageSrc: 'images/supreme_caps1.jpeg', category: 'other' },
    // { id: 28, name: 'Supreme Design', price: 750, imageSrc: 'images/supreme_design.jpeg' },
    // { id: 29, name: 'Supreme Discount', price: 950, imageSrc: 'images/supreme_discount.jpeg' },
    { id: 30, name: 'Supreme Hoodie', price: 1300, imageSrc: 'images/supreme_hoodie1.jpeg', category: 'hoodies' },
    { id: 31, name: 'Supreme Hoodie 13', price: 1300, imageSrc: 'images/supreme_hoodie13.jpeg', category: 'hoodies' },
    { id: 32, name: 'Supreme Hoodie 2', price: 1300, imageSrc: 'images/supreme_hoodie2.jpeg', category: 'hoodies' },
    { id: 33, name: 'Supreme Hoodie 5', price: 1300, imageSrc: 'images/supreme_hoodie5.jpeg', category: 'hoodies' },
    { id: 34, name: 'Supreme Hoodie 6', price: 1300, imageSrc: 'images/supreme_hoodie6.jpeg', category: 'hoodies' },
    { id: 35, name: 'Supreme Hoodie 8', price: 1300, imageSrc: 'images/supreme_hoodie8.jpeg', category: 'hoodies' },
    { id: 36, name: 'Supreme Pants', price: 1400, imageSrc: 'images/supreme_pants1.jpeg', category: 'pants' },
    { id: 37, name: 'Supreme Shorts', price: 1000, imageSrc: 'images/supreme_shorts11.jpeg', category: 'pants' },
    { id: 38, name: 'Supreme Triple 9', price: 1100, imageSrc: 'images/supreme_triple9.jpeg', category: 'tshirts' },
    { id: 39, name: 'Supreme Triple 10', price: 1100, imageSrc: 'images/supreme_triple10.jpeg', category: 'tshirts' },
];

const productLength = products.length;

const productContainer = document.getElementById("product-container");

let currentFilter = 'all';

function renderProducts(productsToRender) {
    if (productContainer) {
        let html = "";

        for (let i = 0; i < productsToRender.length; i++){
            html += `<div class="product-card">
                  <img src="${productsToRender[i].imageSrc}" class="product" alt="${productsToRender[i].name}">
                  <h3>${productsToRender[i].name}</h3>
                  <p>$${productsToRender[i].price}</p>
                    <button type="button">Add to Cart</button>
               </div>`;
        }
        
        productContainer.innerHTML = html;
    }
}

// Initial render with all products
renderProducts(products);

// Filter functionality
function filterProducts(category) {
    currentFilter = category;
    
    let filteredProducts;
    if (category === 'all') {
        filteredProducts = products;
    } else {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    renderProducts(filteredProducts);
    
    // Update active button states
    const allFilterBtns = document.querySelectorAll('.filter-btn');
    allFilterBtns.forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
    }
}

// Add event listeners to filter buttons
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Hamburger menu functionality
    const hamburgerToggle = document.getElementById('hamburger-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    
    if (hamburgerToggle) {
        hamburgerToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
        });
    }
    
    // Close menu when clicking outside
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    }
});

// Dark mode toggle
const themeToggle = document.getElementById('theme-toggle');

if (themeToggle) {
    // Check for saved theme or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const svg = themeToggle.querySelector('svg');
    if (!svg) return;
    
    const pathElement = svg.querySelector('path');
    
    if (theme === 'dark') {
        // Change to sun icon
        svg.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        // Change back to moon icon
        svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}

