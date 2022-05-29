import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';

// @ts-ignore
import yahooStockPrices, { StockPrice } from 'yahoo-stock-prices';

// // Train a simple model:
// const model = tf.sequential();
// model.add(tf.layers.dense({ units: 100, activation: 'relu', inputShape: [10] }));
// model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
// model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

// const xs = tf.randomNormal([100, 10]);
// const ys = tf.randomNormal([100, 1]);

// model.fit(xs, ys, {
//   epochs: 100,
//   callbacks: {
//     onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log?.loss}`),
//   },
// });

(async () => {
  // Load target crypto stock data
  const cryptoCurrency = 'BTC';
  const againstCurrency = 'USD';
  const stockName = `${cryptoCurrency}-${againstCurrency}`;

  const start = new Date('2016-01-01');
  const end = new Date();

  let prices: StockPrice[];
  const fileName = path.join(__dirname, 'data', `${stockName}.json`);
  if (!fs.existsSync(fileName)) {
    console.log(`Load from Yahoo Finance: ${stockName} stock data`);
    prices = await yahooStockPrices.getHistoricalPrices(
      start.getMonth(),
      start.getDay(),
      start.getFullYear(),
      end.getMonth(),
      end.getDay(),
      end.getFullYear(),
      stockName,
      '1d'
    );
    const pricesJson = JSON.stringify(prices);
    // console.log(prices.length);
    fs.writeFileSync(path.join(__dirname, 'data', `${stockName}.json`), pricesJson);
  } else {
    console.log(`Load from presaved file: ${stockName} stock data`);
    prices = JSON.parse(fs.readFileSync(fileName, 'utf-8')) as StockPrice[];
  }
  console.log(`The number of records of ${stockName} is ${prices.length}`);

  // Prepare
})();
