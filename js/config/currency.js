// Currency localization — auto-detect user country via IP, convert prices from NGN
// ExchangeRate-API for conversion, IP geolocation for detection

const BASE_CURRENCY = 'NGN';
const CACHE_KEY = 'section97-currency';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const ER_API_KEY = '8b0197e597d61f073a039767';

// ─── State ───────────────────────────────────────
let userCurrency = BASE_CURRENCY;
let exchangeRate = 1;
let readyCallbacks = [];

// ─── IP Detection ───────────────────────────────

async function detectCurrencyFromIP() {
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
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
            ]);
            if (currency) return currency;
        } catch (e) {
        }
    }
    return null;
}

// ─── Exchange Rate (ExchangeRate-API) ───────────

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
        const url = `https://v6.exchangerate-api.com/v6/${ER_API_KEY}/latest/${BASE_CURRENCY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.result !== 'success') throw new Error(data['error-type'] || 'API error');

        const rate = data.conversion_rates?.[targetCurrency];
        if (!rate) throw new Error(`No rate for ${targetCurrency}`);

        return rate;
    } catch (e) {
        return 1;
    }
}

// ─── Init ───────────────────────────────────────

export async function initializeCurrency() {
    // Always detect current location — catches VPN on/off without manual cache clear
    const detected = await detectCurrencyFromIP();
    const currentCurrency = detected || BASE_CURRENCY;

    // Use cached exchange rate only if currency still matches
    const cached = loadCache();
    if (cached && cached.currency === currentCurrency) {
        userCurrency = cached.currency;
        exchangeRate = cached.rate;
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
        return;
    }

    // Currency changed or no cache — fetch fresh rate
    userCurrency = currentCurrency;
    exchangeRate = await fetchExchangeRate(userCurrency);

    saveCache(userCurrency, exchangeRate);

    currencyReady = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks = [];
}

// ─── Locale Map (ensures correct currency symbols) ───

const CURRENCY_LOCALE_MAP = {
    NGN: 'en-NG', USD: 'en-US', GBP: 'en-GB', EUR: 'de-DE',
    CAD: 'en-CA', AUD: 'en-AU', JPY: 'ja-JP', KES: 'en-KE',
    GHS: 'en-GH', ZAR: 'en-ZA', INR: 'en-IN',
};

function localeForCurrency(currency) {
    return CURRENCY_LOCALE_MAP[currency] || navigator.language || 'en-US';
}

// ─── Format ─────────────────────────────────────

export function formatPrice(ngnAmount, { compact = false } = {}) {
    const converted = ngnAmount * exchangeRate;

    if (compact) {
        return formatCompact(converted);
    }

    try {
        return new Intl.NumberFormat(localeForCurrency(userCurrency), {
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
        return new Intl.NumberFormat(localeForCurrency(userCurrency), {
            style: 'currency',
            currency: userCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(0).replace(/[\d\s.,]/g, '');
    } catch (e) {
        return userCurrency + ' ';
    }
}

