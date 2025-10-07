// crypto-table.js

async function loadCryptoData() {
    try {
        // !!! UPDATED URL: Now calling your own backend proxy !!!
        // Request 20 coins for the table
        const response = await fetch('http://localhost:3000/api/markets?per_page=30');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        const tableBody = document.getElementById('crypto-table');
        tableBody.innerHTML = ''; // clear old data

        data.forEach((coin, index) => {
            const isUp = coin.price_change_percentage_24h >= 0;
            const arrow = isUp ? '▲' : '▼';
            const className = isUp ? "green" : "red";
            const change = Math.abs(coin.price_change_percentage_24h || 0).toFixed(2);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <img src="${coin.image}" alt="${coin.name}" width="20" style="vertical-align: middle; margin-right: 8px;">
                    ${coin.name} (${coin.symbol.toUpperCase()})
                </td>
                <td>$${coin.current_price.toLocaleString()}</td>
                <td>
                    <span class="${className}" style="font-weight: bold;">${arrow}</span> ${change}%
                </td>
                <td>$${coin.market_cap.toLocaleString()}</td>
                <td><canvas id="sparkline-${coin.id}" width="120" height="30"></canvas></td>
            `;
            tableBody.appendChild(row);

            // Draw sparkline chart for each coin
            drawSparkline(coin);
        });
    } catch (error) {
        console.error("Error loading crypto data:", error);
        document.getElementById('crypto-table').innerHTML = `<td colspan="6" style="color: red; text-align: center;">Error: ${error.message || 'Failed to load crypto data.'}</td>`;
    }
}

// This function remains the same as it handles Chart.js, not API calls
function drawSparkline(coin) {
    const ctx = document.getElementById(`sparkline-${coin.id}`).getContext('2d');
    if (!ctx) return; // Ensure context exists

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

loadCryptoData();
// Set a longer interval (e.g., 90 seconds)
setInterval(loadCryptoData, 90000);