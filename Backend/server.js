// backend/server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_key_that_is_long_and_secure';
const CMC_API_KEY = 'd38f55359c7e4cd6a8d19644b934ab19';
const CACHE_LIFETIME_MINUTES = 5;

app.use(cors());
app.use(express.json());
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'CoinMatrix',
  password: 'Dl7ch@5965',
  port: 5432,
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'No token provided.'});
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token is not valid.'});
        req.user = user;
        next();
    });
};

// --- DATABASE CACHE FUNCTION ---
async function getCachedData(cacheKey, fetchFunction) {
    const client = await pool.connect();
    try {
        const dbResult = await client.query(
            `SELECT data FROM api_cache WHERE cache_key = $1 AND cached_at > NOW() - INTERVAL '${CACHE_LIFETIME_MINUTES} minutes'`,
            [cacheKey]
        );
        if (dbResult.rowCount > 0) {
            return dbResult.rows[0].data;
        } else {
            const newData = await fetchFunction();
            await client.query(
                `INSERT INTO api_cache (cache_key, data, cached_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (cache_key) DO UPDATE SET data = $2, cached_at = NOW()`,
                [cacheKey, JSON.stringify(newData)]
            );
            return newData;
        }
    } finally {
        client.release();
    }
}

const fetchMarketDataFromApi = async () => {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 100, page: 1, sparkline: true, price_change_percentage: '1h,24h,7d' }
    });
    return response.data;
};

// --- AUTOMATIC DATA REFRESH SCHEDULER ---
const refreshMarketData = async () => {
    console.log('Running scheduled job: Refreshing market data...');
    try {
        await getCachedData('markets-100', async () => {
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 100, page: 1, sparkline: true, price_change_percentage: '1h,24h,7d' }
            });
            return response.data;
        });
        console.log('Market data refreshed successfully.');
    } catch (error) {
        console.error('Error during scheduled market data refresh:', error.response ? error.response.data : error.message);
    }
};

cron.schedule('*/5 * * * *', refreshMarketData);

// --- API ROUTES ---
app.get('/api/markets', async (req, res) => {
    try {
        const data = await getCachedData('markets-100', fetchMarketDataFromApi);
        if (req.query.ids) {
            const requestedIds = new Set(req.query.ids.split(','));
            const filteredData = data.filter(coin => requestedIds.has(coin.id));
            return res.json(filteredData);
        }
        res.json(data.slice(0, 50));
    } catch (error) {
        console.error('Error in /api/markets route:', error.message);
        res.status(500).json({ error: 'Failed to fetch market data.' });
    }
});

app.get('/api/global', async (req, res) => {
    try {
        const data = await getCachedData('globalData', async () => {
            const response = await axios.get('https://api.coingecko.com/api/v3/global');
            return response.data;
        });
        res.json(data);
    } catch (error) {
        console.error('Error in /api/global route:', error.message);
        res.status(500).json({ error: 'Failed to fetch global data.' });
    }
});

app.get('/api/trending', async (req, res) => {
    try {
        const data = await getCachedData('trendingData', async () => {
            const trendingResponse = await axios.get('https://api.coingecko.com/api/v3/search/trending');
            const trendingCoinIds = trendingResponse.data.coins.map(c => c.item.id).join(',');
            const marketResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${trendingCoinIds}`);
            return marketResponse.data;
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending data.' });
    }
});

app.get('/api/price', async (req, res) => {
    const { ids, vs_currencies } = req.query;
    if (!ids || !vs_currencies) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: { ids, vs_currencies }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch price data' });
    }
});

app.get('/api/coin/:id/chart', async (req, res) => {
    const { id } = req.params;
    const { days } = req.query;
    try {
        const data = await getCachedData(`cg-chart-${id}-${days}`, async () => {
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}/market_chart`, { params: { vs_currency: 'usd', days: days } });
            return response.data;
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch chart data for ${id}.` });
    }
});

app.get('/api/cmc/coin/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
        const data = await getCachedData(`cmc-detail-${symbol}`, async () => {
            const [info, quotes] = await Promise.all([
                axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?symbol=${symbol}`, { headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY } }),
                axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}`, { headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY } })
            ]);
            const coinData = quotes.data.data[symbol][0];
            const coinInfo = info.data.data[symbol][0];
            return { ...coinData, logo: coinInfo.logo, quote: coinData.quote.USD };
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch data for ${symbol}.` });
    }
});


// --- 4. Protected Bookmark API Routes ---
app.get('/api/bookmarks', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const queryResult = await pool.query('SELECT coin_id FROM bookmarks WHERE user_id = $1', [userId]);
        const bookmarks = queryResult.rows.map(row => row.coin_id);
        res.json(bookmarks);
    } catch (err) {
        console.error('Error fetching bookmarks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/bookmarks', authenticateToken, async (req, res) => {
    const { coinId } = req.body;
    const userId = req.user.id;
    if (!coinId) {
        return res.status(400).json({ error: 'coinId is required' });
    }
    try {
        const query = 'INSERT INTO bookmarks (user_id, coin_id) VALUES ($1, $2) ON CONFLICT (user_id, coin_id) DO NOTHING';
        await pool.query(query, [userId, coinId]);
        res.status(201).json({ message: 'Bookmark added successfully' });
    } catch (err) {
        console.error('Error adding bookmark:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/bookmarks/:coinId', authenticateToken, async (req, res) => {
    const { coinId } = req.params;
    const userId = req.user.id;
    try {
        const query = 'DELETE FROM bookmarks WHERE user_id = $1 AND coin_id = $2';
        const result = await pool.query(query, [userId, coinId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Bookmark not found.' });
        }
        res.status(200).json({ message: 'Bookmark removed successfully' });
    } catch (err) {
        console.error('Error removing bookmark:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add these routes to server.js

/**
 * @route   GET /api/sentiment/:coinId
 * @desc    Get aggregate sentiment for a coin
 * @access  Public
 */
app.get('/api/sentiment/:coinId', async (req, res) => {
    const { coinId } = req.params;
    try {
        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) AS bullish,
                COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) AS bearish
            FROM coin_sentiment
            WHERE coin_id = $1
        `;
        const result = await pool.query(query, [coinId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching sentiment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/my-vote/:coinId
 * @desc    Get the logged-in user's vote for a coin
 * @access  Protected
 */
app.get('/api/my-vote/:coinId', authenticateToken, async (req, res) => {
    const { coinId } = req.params;
    const userId = req.user.id;
    try {
        const query = 'SELECT vote FROM coin_sentiment WHERE user_id = $1 AND coin_id = $2';
        const result = await pool.query(query, [userId, coinId]);
        if (result.rowCount === 0) {
            return res.json({ vote: null });
        }
        res.json(result.rows[0]);
    } catch (err)
 {
        console.error('Error fetching user vote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/sentiment
 * @desc    Submit or update a user's vote
 * @access  Protected
 */
app.post('/api/sentiment', authenticateToken, async (req, res) => {
    const { coinId, vote } = req.body;
    const userId = req.user.id;

    if (!coinId || !vote || ![-1, 1].includes(vote)) {
        return res.status(400).json({ error: 'Valid coinId and vote (-1 or 1) are required' });
    }

    try {
        const query = `
            INSERT INTO coin_sentiment (user_id, coin_id, vote)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, coin_id) DO UPDATE
            SET vote = $3, created_at = NOW()
        `;
        await pool.query(query, [userId, coinId, vote]);
        res.status(201).json({ message: 'Vote recorded successfully' });
    } catch (err) {
        console.error('Error recording vote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- 5. Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 CoinMatrix data server running on http://localhost:${PORT}`);
});