// globalstats.js

async function fetchGlobalstats() {
    try {
        const response = await fetch('http://localhost:3000/api/global');

        if (!response.ok) { 
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        const data = result.data;

        const totalCrypto = data.active_cryptocurrencies.toLocaleString();
        const totalExchanges = data.markets.toLocaleString();
        const totalmarketcap = `$${Math.round(data.total_market_cap.usd).toLocaleString()}`;
        const volume24h = `$${Math.round(data.total_volume.usd).toLocaleString()}`;
        const btcDominance = data.market_cap_percentage.btc.toFixed(2) + "%";
        const ethDominance = data.market_cap_percentage.eth.toFixed(2) + "%";
        const marketCapChange = data.market_cap_change_percentage_24h_usd.toFixed(2);
        const isUp = marketCapChange >= 0;
        const triangle = isUp ? '▲' : '▼';
        const marketCapChangeColor = isUp ? "green" : "red";

        document.getElementById("global-crypto-data").innerHTML = `
            <div>Cryptos: ${totalCrypto}</div>
            <div>Exchanges: ${totalExchanges}</div>
            <div>
                Market Cap: ${totalmarketcap}
                <span style="color: ${marketCapChangeColor}; font-weight: bold;">
                    ${triangle} ${Math.abs(marketCapChange)}%
                </span>
            </div>
            <div>24h Vol: ${volume24h}</div>
            <div>Dominance: BTC: ${btcDominance} ETH: ${ethDominance} </div>
        `;
    } catch (error) {
        console.error("Error fetching global stats:", error);
        document.getElementById("global-crypto-data").innerHTML = `<div style="color: red;">Error: ${error.message || 'Failed to load global data.'}</div>`;
    }
}

fetchGlobalstats();
setInterval(fetchGlobalstats, 90000);