// Currency localization — auto-detect user currency, convert from NGN
// Uses free APIs (no key required), caches rates in localStorage

const BASE_CURRENCY = 'NGN';
const CACHE_KEY = 'section97-currency';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── State ───────────────────────────────────────
let userCurrency = BASE_CURRENCY;
let exchangeRate = 1;
let currencyReady = false;
let readyCallbacks = [];

// Locale → currency mapping (common ones)
const LOCALE_CURRENCY_MAP = {
    'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD', 'NZ': 'NZD',
    'EU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR', 'PT': 'EUR',
    'FI': 'EUR', 'GR': 'EUR', 'SK': 'EUR', 'SI': 'EUR', 'LT': 'EUR',
    'LV': 'EUR', 'EE': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'CY': 'EUR',
    'JP': 'JPY', 'CN': 'CNY', 'KR': 'KRW', 'IN': 'INR', 'BR': 'BRL',
    'MX': 'MXN', 'ZA': 'ZAR', 'GH': 'GHS', 'KE': 'KES', 'EG': 'EGP',
    'AE': 'AED', 'SA': 'SAR', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
    'CH': 'CHF', 'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON',
    'TR': 'TRY', 'RU': 'RUB', 'NG': 'NGN', 'SG': 'SGD', 'HK': 'HKD',
    'TW': 'TWD', 'TH': 'THB', 'MY': 'MYR', 'PH': 'PHP', 'ID': 'IDR',
    'VN': 'VND', 'PK': 'PKR', 'BD': 'BDT', 'AR': 'ARS', 'CL': 'CLP',
    'CO': 'COP', 'PE': 'PEN',
};

// ─── Detection ──────────────────────────────────

function detectCurrencyFromLocale() {
    try {
        const locale = navigator.language || navigator.languages?.[0] || '';
        // Extract region code (e.g., "en-US" → "US", "fr-FR" → "FR")
        const parts = locale.split('-');
        if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            return LOCALE_CURRENCY_MAP[region] || null;
        }
    } catch (e) { /* ignore */ }
    return null;
}

async function detectCurrencyFromIP() {
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return null;
        const data = await res.json();
        return data.currency || null;
    } catch (e) { return null; }
}

// ─── Exchange Rate ──────────────────────────────

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL) return cached;
    } catch (e) { /* ignore */ }
    return null;
}

function saveCache(currency, rate) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            currency, rate, timestamp: Date.now()
        }));
    } catch (e) { /* ignore */ }
}

async function fetchExchangeRate(targetCurrency) {
    if (targetCurrency === BASE_CURRENCY) return 1;

    try {
        const res = await fetch(
            `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`,
            { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return 1;
        const data = await res.json();
        return data.rates?.[targetCurrency] || 1;
    } catch (e) {
        console.warn('Exchange rate fetch failed, using NGN:', e);
        return 1;
    }
}

// ─── Init ───────────────────────────────────────

export async function initializeCurrency() {
    // Check cache first
    const cached = loadCache();
    if (cached) {
        userCurrency = cached.currency;
        exchangeRate = cached.rate;
        currencyReady = true;
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
        return;
    }

    // Detect currency
    let detected = detectCurrencyFromLocale();
    if (!detected) {
        detected = await detectCurrencyFromIP();
    }

    userCurrency = detected || BASE_CURRENCY;

    // Fetch rate
    exchangeRate = await fetchExchangeRate(userCurrency);
    saveCache(userCurrency, exchangeRate);

    currencyReady = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks = [];
}

// ─── Format ─────────────────────────────────────

export function formatPrice(ngnAmount, { compact = false } = {}) {
    const converted = ngnAmount * exchangeRate;

    if (compact) {
        return formatCompact(converted);
    }

    try {
        return new Intl.NumberFormat(navigator.language || 'en-US', {
            style: 'currency',
            currency: userCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: converted < 100 ? 2 : 0,
        }).format(converted);
    } catch (e) {
        // Fallback if Intl doesn't recognize the currency
        return `${userCurrency} ${Math.round(converted).toLocaleString()}`;
    }
}

function formatCompact(amount) {
    const sym = formatCurrencySymbol();
    if (amount >= 1_000_000) {
        const val = (amount / 1_000_000).toFixed(1).replace(/\.0$/, '');
        return sym + val + 'M';
    }
    if (amount >= 1_000) {
        const val = (amount / 1_000).toFixed(1).replace(/\.0$/, '');
        return sym + val + 'k';
    }
    return sym + Math.round(amount);
}

function formatCurrencySymbol() {
    try {
        return new Intl.NumberFormat(navigator.language || 'en-US', {
            style: 'currency',
            currency: userCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(0).replace(/[\d\s.,]/g, '');
    } catch (e) {
        return userCurrency + ' ';
    }
}

// ─── Getters ────────────────────────────────────

export function getUserCurrency() {
    return userCurrency;
}

export function getExchangeRate() {
    return exchangeRate;
}

export function isNGN() {
    return userCurrency === BASE_CURRENCY;
}

// Convert NGN amount to user currency (raw number)
export function convertFromNGN(ngnAmount) {
    return ngnAmount * exchangeRate;
}

// Wait for currency to be ready (for modules that load before init completes)
export function onCurrencyReady(callback) {
    if (currencyReady) {
        callback();
    } else {
        readyCallbacks.push(callback);
    }
}
