// Unsplash API Service with rate-limit tracking (50 req/hr on Demo)
const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const BASE_URL = 'https://api.unsplash.com';
const RL_KEY = 'unsplash_rl';
const LIMIT = 48; // 2 buffer below Unsplash's 50/hr demo limit
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export class UnsplashRateLimitError extends Error {
    constructor() {
        super('Лимит запросов Unsplash исчерпан. Попробуйте через час.');
        this.name = 'UnsplashRateLimitError';
    }
}

const getRLState = () => {
    try {
        const raw = localStorage.getItem(RL_KEY);
        if (!raw) return { count: 0, windowStart: Date.now() };
        return JSON.parse(raw);
    } catch {
        return { count: 0, windowStart: Date.now() };
    }
};

const incrementRL = () => {
    let state = getRLState();
    const now = Date.now();
    if (now - state.windowStart > WINDOW_MS) {
        state = { count: 1, windowStart: now };
    } else {
        state.count += 1;
    }
    localStorage.setItem(RL_KEY, JSON.stringify(state));
    return state.count;
};

const checkRateLimit = () => {
    const state = getRLState();
    const now = Date.now();
    if (now - state.windowStart > WINDOW_MS) return; // window reset
    if (state.count >= LIMIT) throw new UnsplashRateLimitError();
};

const apiFetch = async (endpoint) => {
    if (!ACCESS_KEY) throw new Error('VITE_UNSPLASH_ACCESS_KEY is not set');
    checkRateLimit();
    incrementRL();
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });
    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);
    return res.json();
};

/**
 * Search photos by query
 * @param {string} query
 * @param {number} page
 * @returns {Promise<{results: Array, total: number}>}
 */
export const searchPhotos = async (query, page = 1) => {
    const data = await apiFetch(
        `/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}&orientation=landscape`
    );
    return data;
};

/**
 * Get a random photo, optionally filtered by query
 * @param {string} query
 * @returns {Promise<Object>}
 */
export const getRandomPhoto = async (query = '') => {
    const q = query ? `&query=${encodeURIComponent(query)}` : '';
    return apiFetch(`/photos/random?orientation=landscape${q}`);
};

/**
 * Normalize a photo object to a consistent shape
 */
export const normalizePhoto = (photo) => ({
    id: photo.id,
    url: photo.urls.regular,
    url_full: photo.urls.full,
    url_thumb: photo.urls.thumb,
    alt: photo.alt_description || photo.description || '',
    photographer: photo.user.name,
    photographer_url: photo.user.links.html,
    color: photo.color,
});

/**
 * Get remaining requests in current window
 */
export const getRemainingRequests = () => {
    const state = getRLState();
    const now = Date.now();
    if (now - state.windowStart > WINDOW_MS) return LIMIT;
    return Math.max(0, LIMIT - state.count);
};
