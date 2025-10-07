// highlights.js

async function loadHighlights() {
    try {
        // Fetch a larger set of market data for more comprehensive sorting
        const marketsResponse = await fetch("http://localhost:3000/api/markets?per_page=250");
        if (!marketsResponse.ok) {
            const errorData = await marketsResponse.json();
            throw new Error(errorData.error || `HTTP error! Status: ${marketsResponse.status} for markets`);
        }
        const coins = await marketsResponse.json();

        // Fetch trending coins
        const trendingResponse = await fetch("http://localhost:3000/api/trending");
        if (!trendingResponse.ok) {
            const errorData = await trendingResponse.json();
            throw new Error(errorData.error || `HTTP error! Status: ${trendingResponse.status} for trending`);
        }
        const trendingData = await trendingResponse.json();

        // --- Derive Highlight Categories from fetched data ---
        const highlightsData = {
            // Top 8 Trending Coins
            trending: trendingData.slice(0, 8),

            // Top 8 Gainers (by 24h price change percentage)
            topGainers: [...coins]
                .filter(coin => coin.price_change_percentage_24h > 0)
                .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
                .slice(0, 8),

            // Top 8 Losers (by 24h price change percentage)
            topLosers: [...coins]
                .filter(coin => coin.price_change_percentage_24h < 0)
                .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
                .slice(0, 8),

            // NEW CATEGORY: Price Change since ATH (%)
            // Filter out coins without ATH data, then sort by ath_change_percentage (ascending for most negative, descending for most positive if you wanted that)
            // Let's sort to show the ones farthest from ATH (most negative percentage change).
            athChange: [...coins]
                .filter(coin => typeof coin.ath_change_percentage === 'number')
                .sort((a, b) => a.ath_change_percentage - b.ath_change_percentage) // Most negative first
                .slice(0, 8),

            // Highest Volume
            highestVolume: [...coins]
                .sort((a, b) => b.total_volume - a.total_volume)
                .slice(0, 8),

            // Most Viewed (Proxy using market cap)
            mostViewed: [...coins]
                .sort((a, b) => b.market_cap - a.market_cap) // Sort by market cap as a proxy
                .slice(0, 8)
        };

        displayHighlights(highlightsData);

    } catch (error) {
        console.error("Error loading highlights:", error);
        document.getElementById('highlights-section').innerHTML = `<p style="color: red; padding: 20px;">Error: ${error.message || 'Failed to load crypto highlights.'}</p>`;
    }
}

// Function to render all highlight cards
function displayHighlights(data) {
    populateCard('trending-coins', '🔥 Trending Coins', data.trending);
    populateCard('top-gainers', '📈 Top Gainers', data.topGainers);
    populateCard('top-losers', '📉 Top Losers', data.topLosers);

    populateCard('ath-change', '⛰️ Price Change since ATH (%)', data.athChange); // Changed: Added mountain emoji
    populateCard('highest-volume', '🥤Highest Volume', data.highestVolume); // Changed: Added bar chart emoji
    populateCard('most-viewed', '👀 Most Viewed', data.mostViewed); // Changed: Added eyes emoji
}

// Function to populate a single highlight card
function populateCard(elementId, title, items) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <h4>${title} <a href="#">more ></a></h4>
            <p style="text-align: center; color: #718096; padding: 20px 0; font-size: 13px;">
                No data available for this category.
            </p>
        `;
        return;
    }

    // --- Generate Header Row HTML ---
    let headerRowHtml = '';
    if (elementId === 'highest-volume') {
        headerRowHtml = `
            <li class="highlight-header two-column-layout">
                <div class="header-coin">Coin</div>
                <div class="header-volume">Volume</div>
            </li>
        `;
    } else if (elementId === 'ath-change') { // NEW HEADER FOR ATH CHANGE
        headerRowHtml = `
            <li class="highlight-header two-column-layout">
                <div class="header-coin">Coin</div>
                <div class="header-ath-change">ATH Change</div>
            </li>
        `;
    } else {
        // Standard 3-column header for Trending, Gainers, Losers, Most Viewed
        headerRowHtml = `
            <li class="highlight-header">
                <div class="header-coin">Coin</div>
                <div class="header-price">Price</div>
                <div class="header-change">24h</div>
            </li>
        `;
    }
    // --- End Header Row HTML ---


    const coinListHtml = items.map(item => {
        // Special handling for Highest Volume (2 columns)
        if (elementId === 'highest-volume') {
            const totalVolume = item.total_volume ? `$${item.total_volume.toLocaleString()}` : 'N/A';
            return `
                <li class="two-column-layout">
                    <div class="coin-info">
                        <img src="${item.image || item.thumb}" alt="${item.name}">
                        <span>${item.name}</span>
                    </div>
                    <div class="coin-volume">${totalVolume}</div>
                </li>
            `;
        }
        // Special handling for ATH Change (2 columns)
        else if (elementId === 'ath-change') {
            const athChange = item.ath_change_percentage;
            const isPositive = athChange >= 0;
            const colorClass = isPositive ? 'green' : 'red'; // Can make it always red if you prefer for "since ATH"
            const changeText = athChange ? `${isPositive ? '▲' : '▼'} ${Math.abs(athChange).toFixed(1)}%` : 'N/A';
            return `
                <li class="two-column-layout">
                    <div class="coin-info">
                        <img src="${item.image || item.thumb}" alt="${item.name}">
                        <span>${item.name}</span>
                    </div>
                    <div class="coin-ath-change ${colorClass}">${changeText}</div>
                </li>
            `;
        }
        // Standard 3-column layout for other cards
        else {
            const price = item.current_price ? `$${item.current_price.toLocaleString()}` : 'N/A';
            const change = item.price_change_percentage_24h;
            const isUp = change >= 0;
            const colorClass = isUp ? 'green' : 'red';
            const changeText = change ? `${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%` : '';
            return `
                <li>
                    <div class="coin-info">
                        <img src="${item.image || item.thumb}" alt="${item.name}">
                        <span>${item.name}</span>
                    </div>
                    <div class="coin-price">${price}</div>
                    <div class="coin-change ${colorClass}">${changeText}</div>
                </li>
            `;
        }
    }).join('');

    container.innerHTML = `
        <h4>${title} <a href="#">more ></a></h4>
        <ul>
            ${headerRowHtml}
            ${coinListHtml}
        </ul>
    `;
    container.style.display = 'block';
}

loadHighlights();
setInterval(loadHighlights, 90000);