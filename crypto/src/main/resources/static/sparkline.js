const chartMap = {};

async function drawSparkline(coinId) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`
    );
    const data = await response.json();

    const ctx = document.getElementById(`sparkline-${coinId}`).getContext("2d");
    const values = data.prices.map(p => p[1]);

    if (chartMap[coinId]) chartMap[coinId].destroy();

    chartMap[coinId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: values.map((_, i) => i),
        datasets: [{
          data: values,
          borderColor: "#22c55e",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  } catch (err) {
    console.error(`Error drawing sparkline for ${coinId}:`, err);
  }
}