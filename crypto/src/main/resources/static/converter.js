
let cryptoList = [];

function openConverter() {
  document.getElementById('converterModal').style.display = 'flex';
  if (cryptoList.length === 0) loadCryptos();
}

function closeConverter() {
  document.getElementById('converterModal').style.display = 'none';
}

async function loadCryptos() {
  const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=100');
  const data = await response.json();
  cryptoList = data;

  const cryptoSelect = document.getElementById('cryptoSelect');
  cryptoSelect.innerHTML = "";
  cryptoList.forEach(coin => {
    const option = document.createElement('option');
    option.value = coin.id;
    option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
    cryptoSelect.appendChild(option);
  });
}

async function convert() {
  const amount = parseFloat(document.getElementById('cryptoAmount').value);
  const cryptoId = document.getElementById('cryptoSelect').value;
  const currency = document.getElementById('currencySelect').value;

  if (!amount || !cryptoId || !currency) {
    alert('Please fill all fields');
    return;
  }

  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${currency}`);
  const data = await res.json();
  const rate = data[cryptoId][currency];

  const result = amount * rate;
  document.getElementById('conversionResult').textContent = `Result: ${result.toLocaleString()} ${currency.toUpperCase()}`;
}
