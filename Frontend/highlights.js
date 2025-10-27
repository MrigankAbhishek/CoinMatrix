// highlights.js

async function loadHighlights() {
    try {
        const marketsResponse = await fetch("http://localhost:3000/api/markets?per_page=100");
        if (!marketsResponse.ok) {
            const errorData = await marketsResponse.json();
            throw new Error(errorData.error || `HTTP error! Status: ${marketsResponse.status} for markets`);
        }
        const coins = await marketsResponse.json();

    
        const trendingResponse = await fetch("http://localhost:3000/api/trending");
        if (!trendingResponse.ok) {
            const errorData = await trendingResponse.json();
            throw new Error(errorData.error || `HTTP error! Status: ${trendingResponse.status} for trending`);
        }
        const trendingData = await trendingResponse.json();

        const highlightsData = {
        
            trending: trendingData.slice(0, 8),
            
            topGainers: [...coins]
                .filter(coin => coin.price_change_percentage_24h > 0)
                .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
                .slice(0, 8),

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

            highestVolume: [...coins]
                .sort((a, b) => b.total_volume - a.total_volume)
                .slice(0, 8),

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

function displayHighlights(data) {
    populateCard('trending-coins', '🔥 Trending Coins', data.trending);
    populateCard('top-gainers', '📈 Top Gainers', data.topGainers);
    populateCard('top-losers', '📉 Top Losers', data.topLosers);

    populateCard('ath-change', '⛰️ Price Change since ATH (%)', data.athChange); // Changed: Added mountain emoji
    populateCard('highest-volume', '🥤Highest Volume', data.highestVolume); // Changed: Added bar chart emoji
    populateCard('most-viewed', '👀 Most Viewed', data.mostViewed); // Changed: Added eyes emoji
}

function populateCard(elementId, title, items) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <h4>${title} <a href="#">more</a></h4>
            <p style="text-align: center; color: #718096; padding: 20px 0; font-size: 13px;">
                No data available for this category.
            </p>
        `;
        return;
    }

    let headerRowHtml = '';
    if (elementId === 'highest-volume') {
        headerRowHtml = `
            <li class="highlight-header two-column-layout">
                <div class="header-coin">Coin</div>
                <div class="header-volume">Volume</div>
            </li>
        `;
    } else if (elementId === 'ath-change') { 
        headerRowHtml = `
            <li class="highlight-header two-column-layout">
                <div class="header-coin">Coin</div>
                <div class="header-ath-change">ATH Change</div>
            </li>
        `;
    } else {
        headerRowHtml = `
            <li class="highlight-header">
                <div class="header-coin">Coin</div>
                <div class="header-price">Price</div>
                <div class="header-change">24h</div>
            </li>
        `;
    }


    const coinListHtml = items.map(item => {
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
        else if (elementId === 'ath-change') {
            const athChange = item.ath_change_percentage;
            const isPositive = athChange >= 0;
            const colorClass = isPositive ? 'green' : 'red'; 
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