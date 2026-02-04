// Shopping cart with localStorage persistence

let cart = [];

// Load cart from localStorage on module init
function loadCart() {
    const saved = localStorage.getItem('section97-cart');
    if (saved) {
        cart = JSON.parse(saved);
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('section97-cart', JSON.stringify(cart));
}

// Update the badge count in the UI
function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    const count = cart.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Add item to cart
export function addToCart(product) {
    cart.push(product);
    saveCart();
    updateBadge();
}

// Remove item from cart by index
export function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateBadge();
}

// Get all cart items
export function getCart() {
    return cart;
}

// Get cart count
export function getCartCount() {
    return cart.length;
}

// Clear entire cart
export function clearCart() {
    cart = [];
    saveCart();
    updateBadge();
}

// Set up click listeners on ADD TO BAG buttons
// Call this after rendering products
export function setupAddToCartButtons() {
    const buttons = document.querySelectorAll('.add-to-cart-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const product = {
                id: this.dataset.id,
                name: this.dataset.name,
                price: this.dataset.price,
                image: this.dataset.image
            };
            addToCart(product);
        });
    });
}

// Initialize cart - call this on page load
export function initializeCart() {
    loadCart();
    updateBadge();
}
