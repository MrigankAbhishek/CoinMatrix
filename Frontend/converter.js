// converter.js

let cryptoList = []; 

function openConverter() {
    document.getElementById('converterModal').style.display = 'flex';
    if (cryptoList.length === 0) {
        loadCryptos();
    }
}

function closeConverter() {
    document.getElementById('converterModal').style.display = 'none';
    document.getElementById('conversionResult').textContent = ''; 
    document.getElementById('cryptoAmount').value = ''; 
}

async function loadCryptos() {
    try {
        const response = await fetch('http://localhost:3000/api/markets?per_page=20');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status} for markets list`);
        }

        const data = await response.json();
        cryptoList = data; 

        const cryptoSelect = document.getElementById('cryptoSelect');
        cryptoSelect.innerHTML = ""; 

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a cryptocurrency';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        cryptoSelect.appendChild(defaultOption);

        cryptoList.forEach(coin => {
            const option = document.createElement('option');
            option.value = coin.id;
            option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
            cryptoSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading cryptocurrencies for converter:", error);
        const cryptoSelect = document.getElementById('cryptoSelect');
        cryptoSelect.innerHTML = `<option value="">Error loading cryptos</option>`;
        alert(`Failed to load cryptocurrencies: ${error.message}`);
    }
}

async function convert() {
    const amount = parseFloat(document.getElementById('cryptoAmount').value);
    const cryptoId = document.getElementById('cryptoSelect').value;
    const currency = document.getElementById('currencySelect').value;
    const conversionResultDiv = document.getElementById('conversionResult');

    if (isNaN(amount) || amount <= 0) {
        conversionResultDiv.textContent = 'Please enter a valid amount.';
        return;
    }
    if (!cryptoId) {
        conversionResultDiv.textContent = 'Please select a cryptocurrency.';
        return;
    }
    if (!currency) {
        conversionResultDiv.textContent = 'Please select a target currency.';
        return;
    }

    conversionResultDiv.textContent = 'Converting...'; 

    try {
        const response = await fetch(`http://localhost:3000/api/price?ids=${cryptoId}&vs_currencies=${currency}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status} for price conversion`);
        }

        const data = await response.json();

        if (data[cryptoId] && data[cryptoId][currency]) {
            const rate = data[cryptoId][currency];
            const result = amount * rate;
            conversionResultDiv.textContent = `Result: ${result.toLocaleString()} ${currency.toUpperCase()}`;
        } else {
            conversionResultDiv.textContent = `Could not get conversion rate for ${cryptoId.toUpperCase()} to ${currency.toUpperCase()}.`;
        }
    } catch (error) {
        console.error("Error during conversion:", error);
        conversionResultDiv.textContent = `Conversion failed: ${error.message}`;
    }
}