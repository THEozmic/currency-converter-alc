let fromCurrency, toCurrency, fromCurrencySymbol, toCurrencySymbol;

const displayValues = (amount, result) => {
  $('.from-box > span').html(fromCurrency);
  $('.to-box > span').html(toCurrency);

  $('.from-box > sup').html(fromCurrencySymbol);
  $('.to-box > sup').html(toCurrencySymbol);

  amount = new Intl.NumberFormat().format(amount);
  result = new Intl.NumberFormat().format((result).toFixed(2));

  $('.from-box > span').html(amount);
  $('.to-box > span').html(result);
}

const populateCurrencies = (() => {
  fetch(`https://free.currencyconverterapi.com/api/v5/currencies`).then(response => response.json())
  .then((response) => {
    const currency = response.results
    Object.keys(response.results).sort().map((key) => {
      $('.currency-select').append(`<option data-value="${[currency[key].id]}" data-symbol="${currency[key].currencySymbol || [currency[key].id]}">${[currency[key].id]} – ${currency[key].currencyName} ${currency[key].currencySymbol ? `(${currency[key].currencySymbol})` : ''}</option>`)
    })
  });
})();


const getValues = () => {
  const amount = $('#amount').val();
  return { amount, fromCurrency, toCurrency};
}

const dbPromise = idb.open('ozmic-currency-converter-db', 2, upgradeDB => {
  upgradeDB.createObjectStore('rates', { keyPath: "id", autoIncrement: true }).createIndex("DataIndex", ["data.name"]);
});

const getRateFromDB = (key) => {
  return dbPromise.then(db => {
    return db.transaction('rates')
      .objectStore('rates')
      .index('DataIndex').get(key);
  }).then((result) => result ? result.data.value : result);
};

const saveRateToDB = (fromCurrency, toCurrency, rate) => {
  dbPromise.then(db => {
    const tx = db.transaction('rates', 'readwrite');
    tx.objectStore('rates').put({
      data: {value: rate, name: fromCurrency+'_'+toCurrency}
    });
    return tx.complete;
  });
}

$('#from-currency').on('change', (event) => {
  fromCurrency = $(event.currentTarget).find(':selected').data('value');
  fromCurrencySymbol = $(event.currentTarget).find(':selected').data('symbol');
});

$('#to-currency').on('change', (event) => {
  toCurrency = $(event.currentTarget).find(':selected').data('value');
  toCurrencySymbol = $(event.currentTarget).find(':selected').data('symbol');
});

$('.convert-button').on('click', async () => {
  const {amount, fromCurrency, toCurrency} = getValues();
  if (!amount || !fromCurrency || !toCurrency) return;
  $('.convert-button').text('LOADING...');

  const rateKey = fromCurrency+'_'+toCurrency;
  const rate = await getRateFromDB([rateKey]);

  if (rate) {
    displayValues(amount, rate * amount);
    $('.convert-button').text('CONVERT');
    $('.conversion-board').removeClass('d-none');
    return;
  }

  fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${fromCurrency}_${toCurrency}&compact=ultra`).then((response) => {
    return response.json()
  }).then((response) => {
    saveRateToDB(fromCurrency, toCurrency, response[rateKey]);
    displayValues(amount, response[rateKey] * amount);
    $('.convert-button').text('CONVERT');
    $('.conversion-board').removeClass('d-none');
  });
});
