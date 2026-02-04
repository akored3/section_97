// Shopping cart with Supabase + localStorage hybrid
import { supabase } from '../config/supabase.js';

let cart = [];
let currentUserId = null;
let useSupabase = false; // Flag to track if Supabase cart is available

// Clear old localStorage cart data (one-time migration to Supabase)
const CART_VERSION = 'v2-supabase';
function migrateOldCartData() {
    const version = localStorage.getItem('section97-cart-version');
    if (version !== CART_VERSION) {
        localStorage.removeItem('section97-cart');
        localStorage.setItem('section97-cart-version', CART_VERSION);
    }
}

// Load cart from localStorage
function loadLocalCart() {
    const saved = localStorage.getItem('section97-cart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
        } catch (e) {
            cart = [];
        }
    }
}

// Save cart to localStorage
function saveLocalCart() {
    localStorage.setItem('section97-cart', JSON.stringify(cart));
}

// Clear local cart
function clearLocalCart() {
    localStorage.removeItem('section97-cart');
}

// Check if cart_items table exists and is accessible
async function checkSupabaseCart() {
    try {
        const { error } = await supabase
            .from('cart_items')
            .select('id')
            .limit(1);

        return !error;
    } catch {
        return false;
    }
}

// Load cart from Supabase
async function loadSupabaseCart() {
    if (!currentUserId) return [];

    try {
        const { data, error } = await supabase
            .from('cart_items')
            .select(`
                id,
                quantity,
                product_id,
                products (
                    id,
                    name,
                    price,
                    image_front
                )
            `)
            .eq('user_id', currentUserId);

        if (error) {
            console.warn('Supabase cart unavailable:', error.message);
            return null; // Return null to indicate failure
        }

        return data.map(item => ({
            id: String(item.products.id),
            name: item.products.name,
            price: item.products.price,
            image: item.products.image_front,
            quantity: item.quantity,
            cartItemId: item.id
        }));
    } catch (e) {
        console.warn('Failed to load Supabase cart:', e);
        return null;
    }
}

// Merge localStorage cart into Supabase on login
async function mergeLocalCartToSupabase() {
    const localCart = JSON.parse(localStorage.getItem('section97-cart') || '[]');

    if (localCart.length === 0 || !currentUserId) return true;

    let allSucceeded = true;

    for (const item of localCart) {
        try {
            const { error } = await supabase
                .from('cart_items')
                .upsert({
                    user_id: currentUserId,
                    product_id: parseInt(item.id),
                    quantity: item.quantity || 1
                }, {
                    onConflict: 'user_id,product_id'
                });

            if (error) {
                console.warn('Error merging cart item:', error.message);
                allSucceeded = false;
            }
        } catch (e) {
            allSucceeded = false;
        }
    }

    if (allSucceeded) {
        clearLocalCart();
    }

    return allSucceeded;
}

// Update the badge count in the UI
function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Add item to cart
export async function addToCart(product) {
    if (currentUserId && useSupabase) {
        // Logged in with Supabase: add to database
        try {
            // Try to increment existing or insert new
            const { error } = await supabase.rpc('increment_cart_quantity', {
                p_user_id: currentUserId,
                p_product_id: parseInt(product.id)
            });

            if (error) {
                // Fallback: try direct upsert
                await supabase
                    .from('cart_items')
                    .upsert({
                        user_id: currentUserId,
                        product_id: parseInt(product.id),
                        quantity: 1
                    }, {
                        onConflict: 'user_id,product_id'
                    });
            }

            // Reload cart from database
            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart) {
                cart = supabaseCart;
            }
        } catch (e) {
            console.warn('Supabase add failed, using localStorage:', e);
            addToLocalCart(product);
        }
    } else {
        // Guest or Supabase unavailable: use localStorage
        addToLocalCart(product);
    }

    updateBadge();
    showAddedFeedback();
    renderCartDrawer();
}

// Add to local cart helper
function addToLocalCart(product) {
    const existing = cart.find(item => item.id === String(product.id));
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        cart.push({ ...product, id: String(product.id), quantity: 1 });
    }
    saveLocalCart();
}

// Show visual feedback when item added
function showAddedFeedback() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.classList.add('pulse');
        setTimeout(() => badge.classList.remove('pulse'), 300);
    }
}

// Remove item from cart
export async function removeFromCart(productId) {
    if (currentUserId && useSupabase) {
        try {
            await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', currentUserId)
                .eq('product_id', parseInt(productId));

            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart) {
                cart = supabaseCart;
            }
        } catch (e) {
            console.warn('Supabase remove failed:', e);
            cart = cart.filter(item => item.id !== String(productId));
            saveLocalCart();
        }
    } else {
        cart = cart.filter(item => item.id !== String(productId));
        saveLocalCart();
    }

    updateBadge();
    renderCartDrawer();
}

// Update item quantity
export async function updateQuantity(productId, quantity) {
    if (quantity < 1) {
        return removeFromCart(productId);
    }

    if (currentUserId && useSupabase) {
        try {
            await supabase
                .from('cart_items')
                .update({ quantity })
                .eq('user_id', currentUserId)
                .eq('product_id', parseInt(productId));

            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart) {
                cart = supabaseCart;
            }
        } catch (e) {
            const item = cart.find(i => i.id === String(productId));
            if (item) {
                item.quantity = quantity;
                saveLocalCart();
            }
        }
    } else {
        const item = cart.find(i => i.id === String(productId));
        if (item) {
            item.quantity = quantity;
            saveLocalCart();
        }
    }

    updateBadge();
    renderCartDrawer();
}

// Get all cart items
export function getCart() {
    return cart;
}

// Get cart total
export function getCartTotal() {
    return cart.reduce((sum, item) => {
        return sum + (parseInt(item.price) * (item.quantity || 1));
    }, 0);
}

// Get cart count
export function getCartCount() {
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

// Clear entire cart
export async function clearCart() {
    if (currentUserId && useSupabase) {
        try {
            await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', currentUserId);
        } catch (e) {
            console.warn('Failed to clear Supabase cart:', e);
        }
    }

    cart = [];
    clearLocalCart();
    updateBadge();
}

// Set up click listeners on ADD TO BAG buttons
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

// Handle auth state changes
export async function handleAuthChange(userId) {
    const wasLoggedIn = !!currentUserId;
    currentUserId = userId;

    if (userId && !wasLoggedIn) {
        // Just logged in
        useSupabase = await checkSupabaseCart();

        if (useSupabase) {
            await mergeLocalCartToSupabase();
            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart) {
                cart = supabaseCart;
            }
        }
        // If Supabase unavailable, keep using localStorage (already loaded)

    } else if (!userId && wasLoggedIn) {
        // Just logged out: reset to localStorage
        useSupabase = false;
        loadLocalCart();

    } else if (userId) {
        // Already logged in, refresh from Supabase
        if (useSupabase) {
            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart) {
                cart = supabaseCart;
            }
        }
    }

    updateBadge();
}

// Initialize cart - call this on page load
export async function initializeCart() {
    // Clear old cart data from before Supabase migration
    migrateOldCartData();

    // Always load localStorage first as fallback
    loadLocalCart();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        currentUserId = user.id;

        // Check if Supabase cart is available
        useSupabase = await checkSupabaseCart();

        if (useSupabase) {
            const supabaseCart = await loadSupabaseCart();
            if (supabaseCart !== null) {
                cart = supabaseCart;
            }
            // If null (error), keep localStorage cart
        }
    }

    updateBadge();

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        await handleAuthChange(session?.user?.id || null);
    });

    console.log('Cart initialized:', {
        userId: currentUserId,
        useSupabase,
        itemCount: cart.length
    });
}

// ===== CART DRAWER =====

// Render cart items into the drawer
function renderCartDrawer() {
    const itemsContainer = document.getElementById('cart-drawer-items');
    const totalEl = document.getElementById('cart-drawer-total');
    const footer = document.getElementById('cart-drawer-footer');
    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div class="cart-drawer-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Your cart is empty</p>
            </div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    itemsContainer.innerHTML = cart.map(item => `
        <div class="cart-drawer-item" data-id="${item.id}">
            <img class="cart-drawer-item-img" src="${item.image}" alt="${item.name}">
            <div class="cart-drawer-item-details">
                <span class="cart-drawer-item-name">${item.name}</span>
                <span class="cart-drawer-item-price">$${parseInt(item.price).toLocaleString()}</span>
                <div class="cart-drawer-item-actions">
                    <div class="cart-drawer-qty">
                        <button class="cart-qty-minus" data-id="${item.id}">-</button>
                        <span>${item.quantity || 1}</span>
                        <button class="cart-qty-plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="cart-drawer-remove" data-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    if (totalEl) {
        totalEl.textContent = `$${getCartTotal().toLocaleString()}`;
    }

    // Attach event listeners
    itemsContainer.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = cart.find(i => i.id === id);
            if (item) updateQuantity(id, (item.quantity || 1) - 1);
        });
    });

    itemsContainer.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = cart.find(i => i.id === id);
            if (item) updateQuantity(id, (item.quantity || 1) + 1);
        });
    });

    itemsContainer.querySelectorAll('.cart-drawer-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.id);
        });
    });
}

// Open drawer
export function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer) return;

    renderCartDrawer();
    drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close drawer
export function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer) return;

    drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Set up drawer close listeners
export function setupCartDrawer() {
    const closeBtn = document.getElementById('cart-drawer-close');
    const overlay = document.getElementById('cart-overlay');

    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    if (overlay) overlay.addEventListener('click', closeCartDrawer);
}
