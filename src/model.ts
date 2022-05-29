import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

// @ts-ignore
import yahooStockPrices from 'yahoo-stock-prices';

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

  const start = new Date('2016-01-01');
  const end = new Date();

  const prices = await yahooStockPrices.getHistoricalPrices(
    start.getMonth(),
    start.getDay(),
    start.getFullYear(),
    end.getMonth(),
    end.getDay(),
    end.getFullYear(),
    `${cryptoCurrency}-${againstCurrency}`,
    '1d'
  );
  console.log(prices.length);
})();
