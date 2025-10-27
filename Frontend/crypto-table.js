// crypto-table.js

async function loadCryptoData() {
    try {
        const response = await fetch('http://localhost:3000/api/markets?per_page=30');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const tableBody = document.getElementById('crypto-table');
        tableBody.innerHTML = '';

        data.forEach((coin, index) => {
            const isUp = coin.price_change_percentage_24h >= 0;
            const className = isUp ? "green" : "red";
            const change = Math.abs(coin.price_change_percentage_24h || 0).toFixed(2);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="bookmark-star" data-coin-id="${coin.id}">☆</span></td>
                <td>${index + 1}</td>
                <td>
                    <a href="coin-detail.html?id=${coin.id}&symbol=${coin.symbol}" class="coin-link">
                        <img src="${coin.image}" alt="${coin.name}" width="20" style="vertical-align: middle; margin-right: 8px;">
                        ${coin.name} (${coin.symbol.toUpperCase()})
                    </a>
                </td>
                <td>
                    <a href="https://www.binance.com/en/trade/${coin.symbol.toUpperCase()}_USDT" target="_blank" rel="noopener noreferrer" class="buy-btn">
                        Buy
                    </a>
                </td>
                <td>$${coin.current_price.toLocaleString()}</td>
                <td><span class="${className}" style="font-weight: bold;">${isUp ? '▲' : '▼'}</span> ${change}%</td>
                <td>$${coin.market_cap.toLocaleString()}</td>
                <td><canvas id="sparkline-${coin.id}" width="120" height="30"></canvas></td>
            `;
            tableBody.appendChild(row);
            drawSparkline(coin);
        });
    } catch (error) {
        console.error("Error loading crypto data:", error);
        document.getElementById('crypto-table').innerHTML = `<td colspan="8" style="color: red; text-align: center;">Error: ${error.message}</td>`;
    }
}



function drawSparkline(coin) {
    const ctx = document.getElementById(`sparkline-${coin.id}`).getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: coin.sparkline_in_7d.price.map((_, i) => i),
            datasets: [{
                data: coin.sparkline_in_7d.price,
                borderColor: coin.price_change_percentage_24h >= 0 ? '#00c853' : '#ff1744',
                borderWidth: 1.5,
                fill: false,
                pointRadius: 0,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

const style = document.createElement('style');
style.innerHTML = `
    .coin-link {
        text-decoration: none;
        color: inherit;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
    }
    .coin-link:hover {
        text-decoration: underline;
    }
    .buy-btn {
        display: inline-block;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 600;
        color: #16c784; /* Green text color */
        background-color: transparent;
        border: 1.5px solid #16c784; /* Green border */
        border-radius: 6px;
        text-decoration: none;
        transition: background-color 0.2s, color 0.2s;
    }
    .buy-btn:hover {
        background-color: #16c784; /* Green background on hover */
        color: #fff; /* White text on hover */
    }
`;
document.head.appendChild(style);


loadCryptoData();
setInterval(loadCryptoData, 90000);