// Currency localization — auto-detect user currency, convert from NGN
// Uses free APIs (no key required), caches rates in localStorage

const BASE_CURRENCY = 'NGN';
const CACHE_KEY = 'section97-currency';
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour (short so VPN/travel picks up fast)

// ─── State ───────────────────────────────────────
let userCurrency = BASE_CURRENCY;
let exchangeRate = 1;
let currencyReady = false;
let readyCallbacks = [];

// Locale → currency mapping (fallback only)
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
        const parts = locale.split('-');
        if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            return LOCALE_CURRENCY_MAP[region] || null;
        }
    } catch (e) { /* ignore */ }
    return null;
}

// IP-based detection — reflects actual location (VPN-aware)
async function detectCurrencyFromIP() {
    // Try multiple providers for reliability
    const providers = [
        async () => {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            return d.currency || null;
        },
        async () => {
            const r = await fetch('https://ipwho.is/');
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            return d.currency?.code || null;
        },
    ];

    for (const provider of providers) {
        try {
            const currency = await Promise.race([
                provider(),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000))
            ]);
            if (currency) return currency;
        } catch (e) { /* try next provider */ }
    }
    return null;
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

    // Try multiple exchange rate APIs
    const apis = [
        async () => {
            const r = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            const rate = d.rates?.[targetCurrency];
            if (!rate || rate === 0) throw new Error('No rate found');
            return rate;
        },
        async () => {
            const r = await fetch(`https://latest.currency-api.pages.dev/v1/currencies/${BASE_CURRENCY.toLowerCase()}.json`);
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            const rate = d[BASE_CURRENCY.toLowerCase()]?.[targetCurrency.toLowerCase()];
            if (!rate || rate === 0) throw new Error('No rate found');
            return rate;
        },
    ];

    for (const api of apis) {
        try {
            const rate = await Promise.race([
                api(),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
            ]);
            if (rate && rate !== 1) {
                console.log(`[Currency] ${BASE_CURRENCY} → ${targetCurrency} rate: ${rate}`);
                return rate;
            }
        } catch (e) {
            console.warn('[Currency] API failed, trying next:', e);
        }
    }

    console.warn(`[Currency] All rate APIs failed for ${targetCurrency}, falling back to NGN`);
    return 1;
}

// ─── Init ───────────────────────────────────────

export async function initializeCurrency() {
    // Check cache first
    const cached = loadCache();
    if (cached && cached.rate !== 1) {
        userCurrency = cached.currency;
        exchangeRate = cached.rate;
        currencyReady = true;
        console.log(`[Currency] Using cached: ${userCurrency} (rate: ${exchangeRate})`);
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
        return;
    }

    // IP detection first (reflects actual location, VPN-aware)
    let detected = await detectCurrencyFromIP();

    // Fall back to browser locale if IP fails
    if (!detected) {
        detected = detectCurrencyFromLocale();
        console.log(`[Currency] IP detection failed, locale fallback: ${detected}`);
    } else {
        console.log(`[Currency] Detected from IP: ${detected}`);
    }

    userCurrency = detected || BASE_CURRENCY;

    // Fetch exchange rate
    if (userCurrency !== BASE_CURRENCY) {
        exchangeRate = await fetchExchangeRate(userCurrency);
    }

    saveCache(userCurrency, exchangeRate);

    currencyReady = true;
    console.log(`[Currency] Ready: ${userCurrency}, rate: ${exchangeRate}`);
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

export function convertFromNGN(ngnAmount) {
    return ngnAmount * exchangeRate;
}

export function onCurrencyReady(callback) {
    if (currencyReady) {
        callback();
    } else {
        readyCallbacks.push(callback);
    }
}
