// Currency localization — auto-detect user country via IP, convert prices from NGN
// ExchangeRate-API for conversion, IP geolocation for detection

const BASE_CURRENCY = 'NGN';
const CACHE_KEY = 'section97-currency';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const ER_API_KEY = '8b0197e597d61f073a039767';

// ─── State ───────────────────────────────────────
let userCurrency = BASE_CURRENCY;
let exchangeRate = 1;
let currencyReady = false;
let readyCallbacks = [];

// ─── IP Detection ───────────────────────────────

async function detectCurrencyFromIP() {
    const providers = [
        async () => {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            console.log('[Currency] ipapi.co response:', d.country, d.currency);
            return d.currency || null;
        },
        async () => {
            const r = await fetch('https://ipwho.is/');
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            console.log('[Currency] ipwho.is response:', d.country, d.currency?.code);
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
            console.warn('[Currency] IP provider failed:', e);
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

        console.log(`[Currency] ExchangeRate-API: 1 ${BASE_CURRENCY} = ${rate} ${targetCurrency}`);
        return rate;
    } catch (e) {
        console.error('[Currency] ExchangeRate-API failed:', e);
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
        console.log(`[Currency] Cached: ${userCurrency} (rate: ${exchangeRate})`);
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
        return;
    }

    // Detect currency from IP (VPN-aware, reflects actual location)
    const detected = await detectCurrencyFromIP();
    userCurrency = detected || BASE_CURRENCY;
    console.log(`[Currency] Detected: ${userCurrency}`);

    // Fetch exchange rate
    exchangeRate = await fetchExchangeRate(userCurrency);
    console.log(`[Currency] Final: ${userCurrency}, rate: ${exchangeRate}`);

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
