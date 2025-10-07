// backend/server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000; // The port your backend server will run on

// --- 1. Middleware Setup ---

// Enable CORS: This allows your frontend (which runs from a different origin/port)
// to make requests to this backend server without being blocked by browser security.
app.use(cors());

// Rate Limiter: Protects your API (and CoinGecko) from excessive requests.
// Limits each unique IP address to `max` requests within `windowMs` duration.
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute (in milliseconds)
    max: 30, // Max 30 requests per minute per IP
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after a minute' // Message sent when limit is exceeded
});
// Apply the rate limiter to all routes starting with /api/
app.use('/api/', apiLimiter);

// --- 2. Caching Mechanism Setup ---

// An in-memory object to store cached responses.
const cache = {};
// How long (in milliseconds) data stays fresh in the cache before needing a refresh.
const CACHE_DURATION = 90 * 1000; // 90 seconds

// --- 3. Define API Routes (Your Backend Endpoints) ---

// Route for Global Stats
app.get('/api/global', async (req, res) => {
    const cacheKey = 'globalData'; // Unique key for this data in cache

    // Check if data is in cache and is still fresh
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log("-> Serving /api/global from CACHE");
        return res.json(cache[cacheKey].data); // Return cached data
    }

    // If not in cache or not fresh, fetch from CoinGecko
    try {
        console.log("-> Serving /api/global from COINGECKO API");
        const response = await axios.get('https://api.coingecko.com/api/v3/global');

        // Store the new data in cache
        cache[cacheKey] = { data: response.data, timestamp: Date.now() };
        res.json(response.data); // Return data to frontend
    } catch (error) {
        console.error('Error fetching global data from CoinGecko:', error.message);
        res.status(500).json({ error: 'Failed to fetch global data' });
    }
});

// Route for Market Data (Main Table, Converter dropdown)
app.get('/api/markets', async (req, res) => {
    const perPage = req.query.per_page || '100'; // Get per_page from frontend query, default 100
    const cacheKey = `markets-${perPage}`; // Cache key includes per_page for different data sets

    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log(`-> Serving /api/markets?per_page=${perPage} from CACHE`);
        return res.json(cache[cacheKey].data);
    }

    try {
        console.log(`-> Serving /api/markets?per_page=${perPage} from COINGECKO API`);
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: perPage,
                page: '1', // Always fetch first page for simplicity
                sparkline: true // Include sparkline data
            }
        });
        cache[cacheKey] = { data: response.data, timestamp: Date.now() };
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching market data from CoinGecko:', error.message);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

// Route for Trending Coins (Highlights Section)
app.get('/api/trending', async (req, res) => {
    const cacheKey = 'trendingData';

    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log("-> Serving /api/trending from CACHE");
        return res.json(cache[cacheKey].data);
    }

    try {
        console.log("-> Serving /api/trending from COINGECKO API");
        // First, get trending coin IDs
        const trendingResponse = await axios.get('https://api.coingecko.com/api/v3/search/trending');
        const trendingCoinIds = trendingResponse.data.coins.map(c => c.item.id).join(',');

        // Then, get full market data for these trending coins
        const marketResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${trendingCoinIds}`);

        cache[cacheKey] = { data: marketResponse.data, timestamp: Date.now() };
        res.json(marketResponse.data);
    } catch (error) {
        console.error('Error fetching trending data from CoinGecko:', error.message);
        res.status(500).json({ error: 'Failed to fetch trending data' });
    }
});

app.get('/api/categories', async (req, res) => {
    const cacheKey = 'categoriesData';
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log("-> Serving /api/categories from CACHE");
        return res.json(cache[cacheKey].data);
    }
    try {
        console.log("-> Serving /api/categories from COINGECKO API");
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/categories');
        cache[cacheKey] = { data: response.data, timestamp: Date.now() };
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories data from CoinGecko' });
    }
});

// Route for Simple Price Conversion (Crypto Converter)
app.get('/api/price', async (req, res) => {
    const { ids, vs_currencies } = req.query; // Get coin ID and target currencies from frontend

    // Basic validation
    if (!ids || !vs_currencies) {
        return res.status(400).json({ error: 'Missing required query parameters: ids, vs_currencies' });
    }

    // Note: For real-time conversions, often you might not cache this data aggressively
    // or have a very short cache duration, as users expect immediate up-to-date rates.
    // For simplicity and to show a direct proxy, we omit specific caching for this endpoint here.

    try {
        console.log(`-> Serving /api/price for ${ids} to ${vs_currencies} from COINGECKO API`);
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: { ids, vs_currencies }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching price data from CoinGecko:', error.message);
        res.status(500).json({ error: 'Failed to fetch price data' });
    }
});



// --- 4. Start the Server ---
app.listen(PORT, () => {
    console.log(`CoinMatrix backend server running on http://localhost:${PORT}`);
});