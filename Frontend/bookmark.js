// bookmark.js

document.addEventListener('DOMContentLoaded', () => {
    // A short delay to ensure the crypto table (if present) has loaded
    setTimeout(() => {
        const tableBody = document.getElementById('crypto-table');
        
        if (window.location.pathname.includes('bookmarked.html')) {
            // If we are on the portfolio page, load the dashboard and table
            displayBookmarkedCoins();
        } else {
            // If on any other page with stars, just initialize their state
            initializeStars();
        }
        
        // Add the click listener to the table body for handling star clicks
        if (tableBody) {
            tableBody.addEventListener('click', handleStarClick);
        }
    }, 100); // 100ms delay
});

let bookmarkedCoinIds = new Set();

/**
 * Fetches the user's bookmarks and updates the star icons on the page.
 */
async function initializeStars() {
    const token = localStorage.getItem('token');
    if (!token) {
        updateAllStarIcons(); // Update stars to empty if not logged in
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/bookmarks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            console.warn("User is not authenticated. Cannot fetch bookmarks.");
            return; // Stop execution if not authorized
        }
        if (!response.ok) throw new Error('Could not fetch bookmarks');

        const bookmarks = await response.json();
        bookmarkedCoinIds = new Set(bookmarks);

        // Update icons after a brief delay to ensure DOM is ready
        setTimeout(updateAllStarIcons, 500); 

    } catch (error) {
        console.error("Error initializing bookmarks:", error);
    }
}

/**
 * Updates all star icons on the page based on the bookmarkedCoinIds set.
 */
function updateAllStarIcons() {
    document.querySelectorAll('.bookmark-star').forEach(star => {
        const coinId = star.dataset.coinId;
        if (bookmarkedCoinIds.has(coinId)) {
            star.classList.add('bookmarked');
            star.textContent = '★'; // Filled star
        } else {
            star.classList.remove('bookmarked');
            star.textContent = '☆'; // Empty star
        }
    });
}

/**
 * Handles the click event on a bookmark star.
 * @param {Event} event The click event.
 */
async function handleStarClick(event) {
    const star = event.target;
    if (!star.classList.contains('bookmark-star')) return; 

    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Please log in to bookmark coins.", true);
        if (typeof openLoginModal === 'function') {
            openLoginModal(); 
        }
        return;
    }

    const coinId = star.dataset.coinId;
    const isBookmarked = bookmarkedCoinIds.has(coinId);
    const method = isBookmarked ? 'DELETE' : 'POST';
    const url = isBookmarked
        ? `http://localhost:3000/api/bookmarks/${coinId}`
        : 'http://localhost:3000/api/bookmarks';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: method === 'POST' ? JSON.stringify({ coinId }) : null
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update bookmark');
        }

        // Update UI immediately
        if (isBookmarked) {
            bookmarkedCoinIds.delete(coinId);
            star.classList.remove('bookmarked');
            star.textContent = '☆';
            // If on the bookmarked page, remove the row
            if (window.location.pathname.includes('bookmarked.html')) {
                star.closest('tr').remove();
                // Re-analyze dashboard in case this was the last coin
                displayBookmarkedCoins();
            }
        } else {
            bookmarkedCoinIds.add(coinId);
            star.classList.add('bookmarked');
            star.textContent = '★';
        }
    } catch (error) {
        console.error("Failed to update bookmark:", error);
        if (typeof showToast === 'function') {
            showToast("Could not update bookmark. Please try again.", true);
        }
    }
}

/**
 * Fetches, analyzes, and displays the user's bookmarked coins
 * and the personalized dashboard.
 */
async function displayBookmarkedCoins() {
    const token = localStorage.getItem('token');
    const tableBody = document.getElementById('crypto-table');
    const dashboardSection = document.getElementById('dashboard-section');

    if (!token) {
        if (dashboardSection) dashboardSection.innerHTML = ''; // Clear dashboard
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; font-size: 16px;">Please log in to see your bookmarked coins.</td></tr>`;
        return;
    }

    try {
        // Step 1: Fetch Bookmarked IDs
        const response = await fetch('http://localhost:3000/api/bookmarks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Could not fetch bookmarks');

        const bookmarks = await response.json();
        
        if (bookmarks.length === 0) {
            if (dashboardSection) dashboardSection.innerHTML = ''; // Clear dashboard
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; font-size: 16px;">You have no bookmarked coins yet. <br>Click the '☆' on the main page to save a coin.</td></tr>`;
            return;
        }

        // Step 2: Fetch Market Data for Bookmarked Coins
        const coinIdsString = bookmarks.join(',');
        const marketResponse = await fetch(`http://localhost:3000/api/markets?ids=${coinIdsString}`);
        if (!marketResponse.ok) throw new Error('Could not fetch market data for bookmarks');
        const data = await marketResponse.json();

        // Step 3: Analyze the Data and Build the Dashboard
        if (dashboardSection) {
            analyzeAndDisplayDashboard(data);
        }

        // Step 4: Populate the Table
        tableBody.innerHTML = ''; // Clear loading/empty message
        data.forEach((coin, index) => {
            const isUp = coin.price_change_percentage_24h >= 0;
            const className = isUp ? "green" : "red";
            const change = Math.abs(coin.price_change_percentage_24h || 0).toFixed(2);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="bookmark-star bookmarked" data-coin-id="${coin.id}">★</span></td>
                <td>${index + 1}</td>
                <td>
                    <a href="coin-detail.html?id=${coin.id}&symbol=${coin.symbol}" class="coin-link">
                        <img src="${coin.image}" alt="${coin.name}" width="20" style="vertical-align: middle; margin-right: 8px;">
                        ${coin.name} <span style="color: #64748b; text-transform: uppercase;">${coin.symbol}</span>
                    </a>
                </td>
                <td>
                    <a href="https://www.binance.com/en/trade/${coin.symbol.toUpperCase()}_USDT" target="_blank" rel="noopener noreferrer" class="buy-btn">
                        Buy
                    </a>
                </td>
                <td>$${coin.current_price.toLocaleString()}</td>
                <td><span class="${className}">${isUp ? '▲' : '▼'} ${change}%</span></td>
                <td>$${coin.market_cap.toLocaleString()}</td>
                <td><canvas id="sparkline-${coin.id}" width="120" height="30"></canvas></td>
            `;
            tableBody.appendChild(row);

            // This function (drawSparkline) must be available, e.g., from crypto-table.js
            if (typeof drawSparkline === 'function' && coin.sparkline_in_7d && coin.sparkline_in_7d.price) {
                drawSparkline(coin);
            }
        });

    } catch (error) {
        console.error("Error displaying bookmarked coins:", error);
        if (dashboardSection) dashboardSection.innerHTML = ''; // Clear on error
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading your bookmarks. Please try again.</td></tr>`;
    }
}


/**
 * Analyzes coin data and populates the dashboard.
 * @param {Array} coins - The array of bookmarked coin data.
 */
function analyzeAndDisplayDashboard(coins) {
    const dashboardSection = document.getElementById('dashboard-section');
    if (!dashboardSection || !coins || coins.length === 0) return;

    // 1. Find Top Gainer
    const topGainer = [...coins].sort((a, b) => (b.price_change_percentage_24h || -Infinity) - (a.price_change_percentage_24h || -Infinity))[0];

    // 2. Find Top Loser
    const topLoser = [...coins].sort((a, b) => (a.price_change_percentage_24h || Infinity) - (b.price_change_percentage_24h || Infinity))[0];

    // 3. Calculate Sentiment
    const positiveCount = coins.filter(c => (c.price_change_percentage_24h || 0) >= 0).length;
    const totalCount = coins.length;
    const sentimentPercent = totalCount > 0 ? (positiveCount / totalCount) * 100 : 50;

    // Create HTML for cards
    const gainerCard = createDashboardCard('📈 Top Performer (24h)', topGainer, topGainer.price_change_percentage_24h);
    const loserCard = createDashboardCard('📉 Biggest Drop (24h)', topLoser, topLoser.price_change_percentage_24h);
    const sentimentCard = `
        <div class="dashboard-card">
            <h4>📊 Watchlist Sentiment</h4>
            <div class="performance" style="color: ${sentimentPercent >= 50 ? '#16c784' : '#ea3943'};">
                ${sentimentPercent.toFixed(0)}% Bullish
            </div>
            <p style="color: #4a5568; margin-top: 8px; font-size: 14px;">
                ${positiveCount} out of ${totalCount} coins are up today.
            </p>
        </div>`;

    dashboardSection.innerHTML = gainerCard + loserCard + sentimentCard;
}

/**
 * Helper function to create the HTML for a dashboard card.
 * @param {string} title - The title of the card.
 * @param {object} coin - The coin data object.
 * @param {number} performanceValue - The numeric value for performance.
 * @returns {string} HTML string for the card.
 */
function createDashboardCard(title, coin, performanceValue) {
    // Handle null/undefined performanceValue
    const perfValue = performanceValue || 0;
    const isUp = perfValue >= 0;
    const colorClass = isUp ? 'green' : 'red';
    const symbol = isUp ? '▲' : '▼';

    return `
        <div class="dashboard-card">
            <h4>${title}</h4>
            <div class="coin-info">
                <img src="${coin.image}" alt="${coin.name}">
                <div class="coin-details">
                    <div class="name">${coin.name}</div>
                    <div class="symbol">${coin.symbol.toUpperCase()}</div>
                </div>
            </div>
            <div class="performance ${colorClass}">
                ${symbol} ${Math.abs(perfValue).toFixed(2)}%
            </div>
        </div>`;
}