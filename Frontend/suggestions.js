document.addEventListener('DOMContentLoaded', () => {
    loadAndAnalyzeData();
    setInterval(loadAndAnalyzeData, 120000); // Refresh every 2 minutes
});

let suggestionCharts = {}; 

async function loadAndAnalyzeData() {
    try {
        const response = await fetch('http://localhost:3000/api/markets?per_page=40');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const allCryptos = await response.json();
        analyzeAndDisplaySuggestions(allCryptos);
    } catch (error) {
        console.error("Error fetching data for suggestions:", error);
        document.getElementById('investment-suggestions').innerHTML = `<p style="text-align: center; color: red;">Error fetching data. Please try again.</p>`;
    }
}

function analyzeAndDisplaySuggestions(allCryptos) {
    const suggestionsContainer = document.getElementById('investment-suggestions');
    if (!suggestionsContainer) return;
    suggestionsContainer.innerHTML = '';

    const sortedCoins = allCryptos
        .sort((a, b) => {
            // Treat coins with no 7d data as the worst, putting them at the bottom
            const changeA = a.price_change_percentage_7d_in_currency ?? -Infinity;
            const changeB = b.price_change_percentage_7d_in_currency ?? -Infinity;
            return changeB - changeA;
        });

    // Take the top 4 from the sorted list. 
    const topSuggestions = sortedCoins.slice(0, 4);

    if (topSuggestions.length === 0) {
        suggestionsContainer.innerHTML = `<p style="text-align: center; color: #718096;">Could not generate suggestions. Data may be unavailable.</p>`;
        return;
    }

    renderSuggestionCards(topSuggestions);
}

function renderSuggestionCards(suggestedCoins) {
    const suggestionsContainer = document.getElementById('investment-suggestions');

    suggestedCoins.forEach(crypto => {
        const card = document.createElement('div');
        card.classList.add('suggestion-card');

        const priceChange7d = crypto.price_change_percentage_7d_in_currency;
        const change7dClass = priceChange7d >= 0 ? "green" : "red";

        card.innerHTML = `
            <div class="card-header">
                <img src="${crypto.image}" alt="${crypto.name}" class="coin-icon">
                <h3>${crypto.name} <span class="coin-symbol">${crypto.symbol.toUpperCase()}</span></h3>
            </div>
            <div class="card-body">
                <p>Price: <strong>$${crypto.current_price.toLocaleString()}</strong></p>
                <p>7d Change: <strong class="${change7dClass}">${priceChange7d >= 0 ? '▲' : '▼'} ${Math.abs(priceChange7d).toFixed(1)}%</strong></p>
            </div>
            <div class="card-sparkline">
                <canvas id="suggestion-sparkline-${crypto.id}"></canvas>
            </div>
        `;
        suggestionsContainer.appendChild(card);

        if (crypto.sparkline_in_7d && crypto.sparkline_in_7d.price) {
            renderSuggestionSparkline(crypto.id, crypto.sparkline_in_7d.price);
        }
    });
}

function renderSuggestionSparkline(coinId, data) {
    const canvasId = `suggestion-sparkline-${coinId}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (suggestionCharts[canvasId]) {
        suggestionCharts[canvasId].destroy();
    }

    const isPositive = data[data.length - 1] >= data[0];
    const lineColor = isPositive ? '#16c784' : '#ea3943';

    suggestionCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: data,
                borderColor: lineColor,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}