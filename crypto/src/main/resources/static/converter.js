// converter.js

let cryptoList = []; // Stores the list of cryptos for the dropdown

// Opens the converter modal
function openConverter() {
    document.getElementById('converterModal').style.display = 'flex';
    // Only load cryptos if the list is empty (first time opening)
    if (cryptoList.length === 0) {
        loadCryptos();
    }
}

// Closes the converter modal
function closeConverter() {
    document.getElementById('converterModal').style.display = 'none';
    document.getElementById('conversionResult').textContent = ''; // Clear previous result
    document.getElementById('cryptoAmount').value = ''; // Clear amount input
}

// Fetches the list of cryptos for the 'From' dropdown
async function loadCryptos() {
    try {
        // !!! UPDATED URL: Now calling your own backend proxy !!!
        // Request more coins for converter list to ensure common ones are present
        const response = await fetch('http://localhost:3000/api/markets?per_page=250'); 

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status} for markets list`);
        }

        const data = await response.json();
        cryptoList = data; // Store the full list

        const cryptoSelect = document.getElementById('cryptoSelect');
        cryptoSelect.innerHTML = ""; // Clear existing options

        // Add a default "Select a crypto" option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a cryptocurrency';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        cryptoSelect.appendChild(defaultOption);

        // Populate the dropdown with fetched cryptos
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

// Performs the currency conversion
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

    conversionResultDiv.textContent = 'Converting...'; // Show loading message

    try {
        // !!! UPDATED URL: Now calling your own backend proxy !!!
        const response = await fetch(`http://localhost:3000/api/price?ids=${cryptoId}&vs_currencies=${currency}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status} for price conversion`);
        }

        const data = await response.json();

        // Check if data for the cryptoId and currency exists
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