// Checkout page — 4-step flow: Cart → Shipping → Payment (Paystack) → Confirm
import { getCurrentUser } from '../auth/auth.js';
import { supabase, PAYSTACK_PUBLIC_KEY } from '../config/supabase.js';
import { escapeHtml } from '../components/productRenderer.js';
import { initializeCart, getCart, getCartTotal, updateQuantity, removeFromCart, clearCartFull, handleAuthChange } from './cart.js';
import { initPageLoader } from './progressBar.js';

// ─── State ───────────────────────────────────────
let currentStep = 1;
let cartData = [];
let currentUser = null;

// ─── Nigerian States ─────────────────────────────
const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
    'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
    'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
    'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
    'Taraba', 'Yobe', 'Zamfara'
];

// ─── Stepper ─────────────────────────────────────

const STEP_ICONS = {};
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>`;

function updateStepper(step) {
    const steps = document.querySelectorAll('.checkout-step');
    const lines = document.querySelectorAll('.checkout-step-line');

    // Cache original icons on first call
    steps.forEach((el, i) => {
        const icon = el.querySelector('.checkout-step-icon');
        if (!STEP_ICONS[i]) STEP_ICONS[i] = icon.innerHTML;
    });

    steps.forEach((el, i) => {
        const stepNum = i + 1;
        const icon = el.querySelector('.checkout-step-icon');
        el.classList.remove('active', 'completed');

        if (stepNum < step) {
            el.classList.add('completed');
            icon.innerHTML = CHECK_SVG;
        } else if (stepNum === step) {
            el.classList.add('active');
            icon.innerHTML = STEP_ICONS[i];
        } else {
            icon.innerHTML = STEP_ICONS[i];
        }
    });

    lines.forEach((line, i) => {
        line.classList.toggle('completed', i < step - 1);
    });
}

// ─── Step Navigation ─────────────────────────────

function goToStep(step) {
    // Hide all step content
    document.querySelectorAll('.checkout-step-content').forEach(el => el.classList.add('hidden'));

    // Show target step
    const stepIds = ['step-cart', 'step-shipping', 'step-payment', 'step-confirm'];
    const target = document.getElementById(stepIds[step - 1]);
    if (target) target.classList.remove('hidden');

    currentStep = step;
    updateStepper(step);
    updateActionButton(step);

    // Show/hide back button
    const backBtn = document.getElementById('checkout-back-btn');
    if (step === 1 || step === 4) {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActionButton(step) {
    const btn = document.getElementById('checkout-action-btn');
    switch (step) {
        case 1:
            btn.textContent = 'PROCEED TO SHIPPING';
            btn.disabled = false;
            btn.classList.remove('confirmed');
            break;
        case 2:
            btn.textContent = 'PROCEED TO PAYMENT';
            btn.disabled = false;
            btn.classList.remove('confirmed');
            break;
        case 3:
            btn.textContent = 'PROCESSING...';
            btn.disabled = true;
            break;
        case 4:
            btn.textContent = 'ORDER CONFIRMED';
            btn.disabled = true;
            btn.classList.add('confirmed');
            break;
    }
}

// ─── Cart Step Rendering ─────────────────────────

function renderCartItems() {
    cartData = getCart();
    const container = document.getElementById('checkout-items');

    if (cartData.length === 0) {
        container.innerHTML = '<p class="checkout-empty-msg">Your cart is empty</p>';
        return;
    }

    container.innerHTML = cartData.map(item => `
        <div class="checkout-item-card" data-key="${escapeHtml(item.cartKey)}">
            <img class="checkout-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
                 onerror="this.style.display='none'">
            <div class="checkout-item-details">
                <div class="checkout-item-name">${escapeHtml(item.name)}</div>
                ${item.size ? `<span class="checkout-item-tag">SIZE: ${escapeHtml(item.size)}</span>` : ''}
                <div class="checkout-item-qty">
                    <button class="checkout-qty-btn" data-action="dec" data-key="${escapeHtml(item.cartKey)}">−</button>
                    <span class="checkout-qty-val">${item.quantity}</span>
                    <button class="checkout-qty-btn" data-action="inc" data-key="${escapeHtml(item.cartKey)}">+</button>
                </div>
            </div>
            <div class="checkout-item-right">
                <button class="checkout-item-remove" data-action="remove" data-key="${escapeHtml(item.cartKey)}" aria-label="Remove item">×</button>
                <span class="checkout-item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        </div>
    `).join('');

}

function handleCartAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const key = btn.dataset.key;
    const action = btn.dataset.action;
    const item = cartData.find(i => i.cartKey === key);
    if (!item) return;

    if (action === 'inc') {
        updateQuantity(key, item.quantity + 1);
    } else if (action === 'dec') {
        updateQuantity(key, item.quantity - 1);
    } else if (action === 'remove') {
        removeFromCart(key);
    }

    // Re-render after change
    setTimeout(() => {
        renderCartItems();
        renderOrderSummary();

        // If cart became empty, show empty state
        if (getCart().length === 0) {
            showError('empty');
        }
    }, 100);
}

// ─── Order Summary Sidebar ───────────────────────

function renderOrderSummary() {
    cartData = getCart();
    const container = document.getElementById('checkout-summary-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    container.innerHTML = cartData.map(item => `
        <div class="checkout-summary-item">
            <span class="checkout-summary-item-qty">${item.quantity}x</span>
            <span class="checkout-summary-item-name">${escapeHtml(item.name)}</span>
            <span class="checkout-summary-item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');

    const total = getCartTotal();
    subtotalEl.textContent = `₦${total.toLocaleString()}`;
    totalEl.textContent = `₦${total.toLocaleString()}`;
}

// ─── Shipping Validation ─────────────────────────

function validateShipping() {
    const fields = {
        name: document.getElementById('checkout-name'),
        address: document.getElementById('checkout-address'),
        city: document.getElementById('checkout-city'),
        phone: document.getElementById('checkout-phone')
    };

    let valid = true;
    const data = {};

    // Clear previous errors
    Object.values(fields).forEach(f => f?.closest('.form-group')?.classList.remove('invalid'));

    // Name (max 100 chars)
    if (!fields.name.value.trim()) {
        fields.name.closest('.form-group').classList.add('invalid');
        valid = false;
    } else {
        data.name = fields.name.value.trim().slice(0, 100);
    }

    // Address (max 200 chars)
    if (!fields.address.value.trim()) {
        fields.address.closest('.form-group').classList.add('invalid');
        valid = false;
    } else {
        data.address = fields.address.value.trim().slice(0, 200);
    }

    // City (max 50 chars)
    if (!fields.city.value.trim()) {
        fields.city.closest('.form-group').classList.add('invalid');
        valid = false;
    } else {
        data.city = fields.city.value.trim().slice(0, 50);
    }

    // Phone — must start with 0 or +234
    const phone = fields.phone.value.trim();
    const phoneValid = /^(\+234|0)\d{10}$/.test(phone.replace(/\s/g, ''));
    if (!phone || !phoneValid) {
        fields.phone.closest('.form-group').classList.add('invalid');
        valid = false;
    } else {
        data.phone = phone;
    }

    return { valid, data };
}

// ─── Paystack Integration ────────────────────────

function initiatePaystack(email, amountKobo, metadata) {
    return new Promise((resolve, reject) => {
        if (typeof PaystackPop === 'undefined') {
            reject(new Error('Paystack library not loaded. Check your internet connection.'));
            return;
        }

        console.log('Opening Paystack popup…');
        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: email,
            amount: amountKobo,
            currency: 'NGN',
            channels: ['card', 'bank_transfer'],
            metadata: {
                custom_fields: [
                    { display_name: 'Customer Name', variable_name: 'customer_name', value: metadata.name },
                    { display_name: 'Phone', variable_name: 'phone', value: metadata.phone },
                    { display_name: 'Address', variable_name: 'address', value: `${metadata.address}, ${metadata.city}` }
                ]
            },
            callback: (response) => {
                resolve(response.reference);
            },
            onClose: () => {
                reject(new Error('Payment window closed'));
            }
        });
        handler.openIframe();
    });
}

// ─── Order Creation ──────────────────────────────

async function createOrder(userId, cart, reference, shippingData) {
    // Server-side validated order: prices are looked up from the products table,
    // never trusted from the client. Total is calculated server-side.
    const items = cart.map(item => ({
        product_id: parseInt(item.id),
        size: item.size || null,
        quantity: item.quantity
    }));

    const { data: orderId, error } = await supabase.rpc('create_validated_order', {
        p_items: items,
        p_shipping_address: `${shippingData.address}, ${shippingData.city}`,
        p_payment_reference: reference
    });

    if (error) throw error;
    return orderId;
}

// ─── Order ID Formatting ─────────────────────────

function formatOrderId(uuid) {
    // S97-XXXX-XXXX from last 8 chars of UUID
    const clean = uuid.replace(/-/g, '').slice(-8).toUpperCase();
    return `S97-${clean.slice(0, 4)}-${clean.slice(4)}`;
}

// ─── Toast Notification ──────────────────────────

function showToast(message) {
    const toast = document.getElementById('checkout-toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ─── Error States ────────────────────────────────

function showError(type) {
    // Hide main checkout UI
    document.querySelector('.checkout-body')?.classList.add('hidden');
    document.querySelector('.checkout-stepper')?.classList.add('hidden');
    document.querySelector('.checkout-header')?.classList.add('hidden');

    if (type === 'auth') {
        document.getElementById('checkout-error-auth').classList.remove('hidden');
    } else if (type === 'empty') {
        document.getElementById('checkout-error-empty').classList.remove('hidden');
    }
}

// ─── Main Action Button Handler ──────────────────

async function handleAction() {
    const btn = document.getElementById('checkout-action-btn');

    if (currentStep === 1) {
        // Cart → Shipping
        if (getCart().length === 0) {
            showToast('Your cart is empty');
            return;
        }
        goToStep(2);

    } else if (currentStep === 2) {
        // Shipping → Payment (Paystack popup)
        const { valid, data: shippingData } = validateShipping();
        if (!valid) {
            showToast('Please fill in all required fields');
            return;
        }

        btn.textContent = 'PROCESSING...';
        btn.disabled = true;

        try {
            const cart = getCart();
            const total = getCartTotal();
            const amountKobo = Math.round(total * 100);

            // Show payment step on stepper (visual only — Paystack popup overlays the page)
            updateStepper(3);

            // Open Paystack popup
            console.log('Initiating Paystack payment…');
            const reference = await initiatePaystack(currentUser.email, amountKobo, shippingData);

            // Payment succeeded — create order
            btn.textContent = 'CREATING ORDER...';
            const orderId = await createOrder(currentUser.id, cart, reference, shippingData);

            // Clear cart
            await clearCartFull();

            // Show confirmation
            document.getElementById('checkout-order-id').textContent = `ORDER ID: ${formatOrderId(orderId)}`;
            goToStep(4);

        } catch (err) {
            // Restore stepper to shipping
            updateStepper(2);
            btn.disabled = false;
            btn.textContent = 'PROCEED TO PAYMENT';

            if (err.message === 'Payment window closed') {
                showToast('Payment cancelled. Your cart is still saved.');
            } else {
                showToast('Something went wrong. Please try again.');
                console.error('Checkout error:', err.message || err);
            }
        }
    }
}

// ─── Back Button Handler ─────────────────────────

function handleBack() {
    if (currentStep === 2) goToStep(1);
}

// ─── Theme Toggle ────────────────────────────────

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const svg = themeToggle.querySelector('svg');

    function updateIcon(theme) {
        if (theme === 'dark') {
            svg.innerHTML = `
                <circle cx="32" cy="32" r="10"/>
                <line x1="32" y1="4" x2="32" y2="12"/>
                <line x1="32" y1="52" x2="32" y2="60"/>
                <line x1="10" y1="10" x2="16" y2="16"/>
                <line x1="48" y1="48" x2="54" y2="54"/>
                <line x1="4" y1="32" x2="12" y2="32"/>
                <line x1="52" y1="32" x2="60" y2="32"/>
                <line x1="10" y1="54" x2="16" y2="48"/>
                <line x1="48" y1="16" x2="54" y2="10"/>`;
        } else {
            svg.innerHTML = '<path d="M38 6C22 6 10 18 10 32C10 46 22 58 38 58C30 52 26 42 26 32C26 22 30 12 38 6Z"/><circle cx="44" cy="16" r="1.5" stroke-width="0.9" opacity="0.4"/><circle cx="50" cy="26" r="1" stroke-width="0.75" opacity="0.3"/>';
        }
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });
}

// ─── Initialize ──────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const loader = initPageLoader('checkout-loader');
    setupThemeToggle();
    await initializeCart();

    const user = await getCurrentUser();

    // Auth guard
    if (!user) return showError('auth');

    currentUser = user;

    // Sync cart with Supabase
    await handleAuthChange(user.id);

    const cart = getCart();

    // Empty cart guard
    if (cart.length === 0) return showError('empty');

    // Complete progress bar and render cart
    if (loader) loader.complete();
    renderCartItems();
    renderOrderSummary();
    updateStepper(1);

    // Wire cart item actions (event delegation — added once)
    document.getElementById('checkout-items').addEventListener('click', handleCartAction);

    // Wire action button
    document.getElementById('checkout-action-btn').addEventListener('click', handleAction);
    document.getElementById('checkout-back-btn').addEventListener('click', handleBack);
});
