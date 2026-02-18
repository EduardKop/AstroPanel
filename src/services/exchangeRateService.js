/**
 * Exchange Rate Service
 * Uses fawazahmed0/exchange-api (GitHub Pages, no API key, updates daily)
 * https://github.com/fawazahmed0/exchange-api
 *
 * Caches rates in localStorage for 24 hours to avoid redundant requests.
 */

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Primary and fallback CDN endpoints
const API_URLS = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
    'https://latest.currency-api.pages.dev/v1/currencies/eur.json',
];

/**
 * Fetch EUR-based rates from cache or API.
 * Returns an object: { uah: 0.023, pln: 0.23, ... }
 * (how many EUR = 1 unit of that currency, i.e. rate = 1/X)
 * Actually the API returns: eur.uah = how many UAH per 1 EUR
 * So to convert local → EUR: amountEUR = amountLocal / eur[currency]
 */
const fetchRates = async () => {
    // 1. Check cache
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { rates, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS) {
                return rates;
            }
        }
    } catch (_) {
        // ignore parse errors
    }

    // 2. Fetch from API (try primary, then fallback)
    let data = null;
    for (const url of API_URLS) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                data = await res.json();
                break;
            }
        } catch (_) {
            // try next
        }
    }

    if (!data?.eur) {
        throw new Error('Exchange rate API unavailable');
    }

    const rates = data.eur; // { uah: 44.5, pln: 4.27, ... } — units per 1 EUR

    // 3. Save to cache
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
    } catch (_) {
        // ignore storage errors
    }

    return rates;
};

/**
 * Convert local currency amount to EUR.
 * @param {number} amount - Amount in local currency
 * @param {string} currencyCode - ISO currency code (e.g. 'UAH', 'PLN')
 * @returns {Promise<{ eur: string, rate: number, fromCache: boolean } | null>}
 */
export const convertToEUR = async (amount, currencyCode) => {
    if (!amount || isNaN(amount)) return null;
    if (currencyCode === 'EUR') return { eur: parseFloat(amount).toFixed(2), rate: 1, fromCache: true };

    const code = currencyCode.toLowerCase();

    try {
        const rates = await fetchRates();
        const ratePerEur = rates[code]; // e.g. rates.uah = 44.5 means 1 EUR = 44.5 UAH

        if (!ratePerEur) {
            console.warn(`No rate found for ${currencyCode}, returning raw amount`);
            return { eur: parseFloat(amount).toFixed(2), rate: 1, fromCache: false };
        }

        const eur = (parseFloat(amount) / ratePerEur).toFixed(2);
        const cached = !!localStorage.getItem(CACHE_KEY);
        return { eur, rate: ratePerEur, fromCache: cached };
    } catch (err) {
        console.error('Exchange rate fetch failed:', err);
        return null; // Let caller handle fallback
    }
};

/**
 * Get the last time rates were fetched (for UI display).
 * @returns {Date|null}
 */
export const getRatesLastUpdated = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp } = JSON.parse(cached);
            return new Date(timestamp);
        }
    } catch (_) { }
    return null;
};

/**
 * Force-clear the cache (useful for manual refresh).
 */
export const clearRatesCache = () => {
    localStorage.removeItem(CACHE_KEY);
};
