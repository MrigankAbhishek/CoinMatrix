async function loadCryptoData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
      '?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true'
    );
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
        <td><canvas id="sparkline-${coin.id}" width="120" height="30";"></canvas></td>
      </table>
      `;
      tableBody.appendChild(row);

      // Draw sparkline chart for each coin
      drawSparkline(coin);
    });
  } catch (error) {
    console.error("Error loading crypto data:", error);
    document.getElementById('crypto-table').innerHTML = "Failed to load crypto data.";
  }
}

function drawSparkline(coin) {
  const ctx = document.getElementById(`sparkline-${coin.id}`).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: coin.sparkline_in_7d.price.map((_, i) => i),
      datasets: [{
        data: coin.sparkline_in_7d.price,
        borderColor: coin.price_change_percentage_24h >= 0 ? '#00c853' : '#ff1744',
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        tension: 0.3 // smooth line
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
setInterval(loadCryptoData, 60000);
