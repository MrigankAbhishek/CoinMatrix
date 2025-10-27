let mainChart;

document.addEventListener('DOMContentLoaded', () => {
    const coinGeckoId = getCoinParam('id');
    const cmcSymbol = getCoinParam('symbol');

    if (coinGeckoId && cmcSymbol) {
        initializeCoinDetailPage(coinGeckoId, cmcSymbol);
    } else {
        const container = document.getElementById('coin-detail-container');
        container.innerHTML = `<p class="loading-text" style="color: red;">Could not find coin ID or symbol in URL.</p>`;
    }
});

/**
 * Parses a specific parameter from the URL's query string.
 * @param {string} paramName - The name of the parameter to get (e.g., 'id', 'symbol').
 * @returns {string|null} The parameter's value or null if not found.
 */
function getCoinParam(paramName) {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
}

/**
 * Orchestrates the fetching and rendering of the entire detail page.
 * @param {string} coinGeckoId - The coin's ID for the CoinGecko API (e.g., 'bitcoin').
 * @param {string} cmcSymbol - The coin's symbol for the CoinMarketCap API (e.g., 'BTC').
 */
async function initializeCoinDetailPage(coinGeckoId, cmcSymbol) {
    const container = document.getElementById('coin-detail-container');
    try {
        const [coinData, chartData] = await Promise.all([
            fetchCoinDetails(cmcSymbol),
            fetchChartData(coinGeckoId, '1')
        ]);

        if (coinData && chartData) {
            displayCoinDetails(coinData);
            loadSentimentData(coinGeckoId);
            drawMainChart(chartData);
            setupTimeframeButtons(coinGeckoId);
        }
    } catch (error) {
        console.error("Failed to initialize detail page:", error);
        container.innerHTML = `<p class="loading-text" style="color: red;">${error.message}</p>`;
    }
}

/**
 * Fetches coin statistics and metadata from the server's CoinMarketCap endpoint.
 * @param {string} symbol - The coin's symbol (e.g., 'BTC').
 * @returns {Promise<object>} The coin's data.
 */
async function fetchCoinDetails(symbol) {
    const response = await fetch(`http://localhost:3000/api/cmc/coin/${symbol}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Fetches historical price data from the server's CoinGecko endpoint.
 * @param {string} id - The coin's ID (e.g., 'bitcoin').
 * @param {string} days - The number of days for the chart data.
 * @returns {Promise<object>} The chart data.
 */
async function fetchChartData(id, days = '1') {
    const response = await fetch(`http://localhost:3000/api/coin/${id}/chart?days=${days}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Renders the fetched coin data into the HTML.
 * @param {object} data - The combined coin data from the server.
 */
function displayCoinDetails(data) {
    const container = document.getElementById('coin-detail-container');
    const quote = data.quote;

    const priceChange24h = quote.percent_change_24h;
    const isUp = priceChange24h >= 0;
    const priceChangeClass = isUp ? 'green' : 'red';
    const priceChangeIcon = isUp ? '▲' : '▼';

    const formatNumber = (num) => num ? `$${num.toLocaleString('en-US')}` : 'N/A';
    const formatSupply = (num) => num ? `${num.toLocaleString('en-US')}` : 'N/A';
    
    // Note: 24h Range is omitted as it's not provided by the CMC endpoint.
   // In coin-detail.js, use this corrected HTML structure for the displayCoinDetails function

container.innerHTML = `
    <section class="coin-header">
        <div class="coin-title">
            <img src="${data.logo}" alt="${data.name}">
            <h1>${data.name}</h1>
            <span class="coin-symbol">${data.symbol}</span>
            <span class="coin-rank">Rank #${data.cmc_rank}</span>
        </div>
        <div class="coin-price-section">
            <div class="coin-price">${formatNumber(quote.price)}</div>
            <div class="price-change ${priceChangeClass}">
                ${priceChangeIcon} ${Math.abs(priceChange24h).toFixed(2)}%
            </div>
        </div>
    </section>
    <section class="coin-body">
        <div class="coin-stats">
            <div class="stat-item"><span class="stat-label">Market Cap</span><span class="stat-value">${formatNumber(quote.market_cap)}</span></div>
            <div class="stat-item"><span class="stat-label">24h Trading Volume</span><span class="stat-value">${formatNumber(quote.volume_24h)}</span></div>
            <div class="stat-item"><span class="stat-label">Fully Diluted Valuation</span><span class="stat-value">${formatNumber(quote.fully_diluted_market_cap)}</span></div>
            <div class="stat-item"><span class="stat-label">Circulating Supply</span><span class="stat-value">${formatSupply(data.circulating_supply)}</span></div>
            <div class="stat-item"><span class="stat-label">Total Supply</span><span class="stat-value">${formatSupply(data.total_supply)}</span></div>
            <div class="stat-item"><span class="stat-label">Max Supply</span><span class="stat-value">${formatSupply(data.max_supply)}</span></div>
            
            <div class="sentiment-section">
                <div class="stat-label">Community Sentiment</div>
                <div id="sentiment-display" class="sentiment-display">
                    <div class="sentiment-bar">
                        <div id="sentiment-bar-bullish" class="sentiment-bar-inner bullish"></div>
                    </div>
                    <div id="sentiment-text" class="sentiment-text">Loading...</div>
                </div>
                <div id="sentiment-buttons" class="sentiment-buttons">
                    <button class="sentiment-btn" data-vote="1">👍 Bullish</button>
                    <button class="sentiment-btn" data-vote="-1">👎 Bearish</button>
                </div>
            </div>
        </div> <div class="coin-chart-area">
            <div class="chart-controls">
                <button class="timeframe-btn active" data-days="1">24H</button>
                <button class="timeframe-btn" data-days="7">7D</button>
                <button class="timeframe-btn" data-days="30">30D</button>
                <button class="timeframe-btn" data-days="90">90D</button>
            </div>
            <div class="chart-container"><canvas id="main-chart-canvas"></canvas></div>
        </div>
    </section>
`;
}

/**
 * Renders the price chart using Chart.js.
 * @param {object} chartData - The historical price data from the server.
 */
function drawMainChart(chartData) {
    const ctx = document.getElementById('main-chart-canvas');
    if (!ctx || !chartData || !chartData.prices) return;

    if (mainChart) mainChart.destroy();

    const prices = chartData.prices;
    const isPositive = prices.length > 1 && prices[prices.length - 1][1] >= prices[0][1];
    const borderColor = isPositive ? '#16c784' : '#ea3943';

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: prices.map(price => dayjs(price[0]).format('MMM DD, h:mm A')),
            datasets: [{
                data: prices.map(price => price[1]),
                borderColor: borderColor, 
                borderWidth: 2, 
                pointRadius: 0, 
                tension: 0.1
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                tooltip: { mode: 'index', intersect: false } 
            },
            scales: { 
                x: { ticks: { autoSkip: true, maxTicksLimit: 7 } }, 
                y: {} 
            }
        }
    });
}

/**
 * Sets up click listeners for the timeframe buttons to update the chart.
 * @param {string} coinGeckoId - The coin's ID used for fetching new chart data.
 */
function setupTimeframeButtons(coinGeckoId) {
    const buttons = document.querySelectorAll('.timeframe-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const days = button.dataset.days;
            try {
                const newChartData = await fetchChartData(coinGeckoId, days);
                if (newChartData) drawMainChart(newChartData);
            } catch (error) {
                console.error("Failed to update chart:", error);
            }
        });
    });
}

// Add these new functions to the end of coin-detail.js

/**
 * Loads and displays aggregate sentiment and user's specific vote.
 * @param {string} coinId The coin's ID (e.g., 'bitcoin').
 */
async function loadSentimentData(coinId) {
    try {
        const token = localStorage.getItem('token');
        let userVote = null;

        // Fetch aggregate sentiment (public)
        const sentimentResponse = await fetch(`http://localhost:3000/api/sentiment/${coinId}`);
        const sentimentData = await sentimentResponse.json();
        
        // If logged in, fetch user's vote (protected)
        if (token) {
            const userVoteResponse = await fetch(`http://localhost:3000/api/my-vote/${coinId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userVoteResponse.ok) {
                const userVoteData = await userVoteResponse.json();
                userVote = userVoteData.vote; // Will be 1, -1, or null
            }
        }
        
        displayAggregateSentiment(sentimentData.bullish, sentimentData.bearish);
        setupSentimentButtons(coinId, userVote);

    } catch (error) {
        console.error("Error loading sentiment:", error);
        document.getElementById('sentiment-text').textContent = 'Error loading sentiment.';
    }
}

/**
 * Updates the sentiment bar and text.
 * @param {number} bullishCount Count of bullish votes.
 * @param {number} bearishCount Count of bearish votes.
 */
function displayAggregateSentiment(bullishCount, bearishCount) {
    const totalVotes = bullishCount + bearishCount;
    const bullishBar = document.getElementById('sentiment-bar-bullish');
    const sentimentText = document.getElementById('sentiment-text');

    if (totalVotes === 0) {
        bullishBar.style.width = '50%'; // Default to 50/50
        sentimentText.textContent = 'No votes yet. Be the first!';
        return;
    }

    const bullishPercent = (bullishCount / totalVotes) * 100;
    
    bullishBar.style.width = `${bullishPercent.toFixed(1)}%`;
    sentimentText.textContent = `${bullishPercent.toFixed(0)}% Bullish (${totalVotes.toLocaleString()} votes)`;
}

/**
 * Sets up button visibility and click handlers.
 * @param {string} coinId The coin's ID.
 * @param {number|null} userVote The user's current vote (1, -1, or null).
 */
function setupSentimentButtons(coinId, userVote) {
    const token = localStorage.getItem('token');
    const buttonContainer = document.getElementById('sentiment-buttons');
    const buttons = buttonContainer.querySelectorAll('.sentiment-btn');
    
    if (token) {
        buttonContainer.style.display = 'flex';
        
        buttons.forEach(btn => {
            const vote = parseInt(btn.dataset.vote, 10);
            
            // Highlight the user's active vote
            if (vote === userVote) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            // Add click listener
            btn.addEventListener('click', () => handleSentimentVote(coinId, vote));
        });
    } else {
        // Not logged in, hide buttons
        buttonContainer.style.display = 'none';
    }
}

/**
 * Handles the click event on a sentiment button.
 * @param {string} coinId The coin's ID.
 * @param {number} vote The vote to submit (1 or -1).
 */
async function handleSentimentVote(coinId, vote) {
    const token = localStorage.getItem('token');
    if (!token) {
        // This function is from auth.js, which is loaded
        openLoginModal(); 
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/sentiment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ coinId, vote })
        });

        if (!response.ok) {
            throw new Error('Failed to submit vote');
        }

        // After successful vote, reload sentiment and update buttons
        loadSentimentData(coinId);
        
        // This function is from auth.js, which is loaded
        showToast('Vote recorded!');

    } catch (error) {
        console.error('Error voting:', error);
        showToast('Could not record vote.', true);
    }
}