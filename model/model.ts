import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import scaler from 'minmaxscaler';

// @ts-ignore
import yahooStockPrices, { StockPrice } from 'yahoo-stock-prices';
import { Sequential } from '@tensorflow/tfjs';

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
  // Load train data
  const cryptoCurrency = 'BTC';
  const againstCurrency = 'USD';
  const stockName = `${cryptoCurrency}-${againstCurrency}`;

  const trainStart = new Date('2017-01-01');
  const trainEnd = new Date('2021-01-01');

  let trainData: StockPrice[];
  const trainFileName = path.join(__dirname, 'data', `${stockName}.json`);
  if (!fs.existsSync(trainFileName)) {
    console.log(`Load from Yahoo Finance: ${stockName} stock data`);
    trainData = await yahooStockPrices.getHistoricalPrices(
      trainStart.getMonth(),
      trainStart.getDay(),
      trainStart.getFullYear(),
      trainEnd.getMonth(),
      trainEnd.getDay(),
      trainEnd.getFullYear(),
      stockName,
      '1d'
    );
    const trainDataJson = JSON.stringify(trainData);
    // console.log(prices.length);
    fs.writeFileSync(path.join(__dirname, 'data', `${stockName}.json`), trainDataJson);
  } else {
    console.log(`Load from presaved file: ${stockName} stock data`);
    trainData = JSON.parse(fs.readFileSync(trainFileName, 'utf-8')) as StockPrice[];
  }
  console.log(`The number of records of ${stockName} is ${trainData.length}`);
  const closePrices = trainData.map((x) => x.close);
  console.log(closePrices.slice(10));

  // const data = [1, 3, 5, 7, 9, 11];
  // const closePrices = data;

  // Prepare data
  const scaledData = scaler.fit_transform(closePrices) as number[];
  // console.log({ scaledData });

  const predictionDays = 60;

  const xTrainNormal = []; // [[60 days price], [60 days price], ...]
  const yTrain = [];

  for (let i = predictionDays; i < scaledData.length; i++) {
    xTrainNormal.push(scaledData.slice(i - predictionDays, i));
    yTrain.push(scaledData[i]);
  }

  console.log(xTrainNormal.length);
  console.log(xTrainNormal[0].length);

  // const xTrain = reshape(xTrainNormal, [xTrainNormal.length, xTrainNormal[0].length, 1]);
  const xTrain = [];

  // Reshaping the train data
  for (let i = 0; i < xTrainNormal.length; i++) {
    xTrain.push(xTrainNormal[i].map((x) => [x]));
  }

  console.log(xTrain.length);
  console.log(xTrain[0].length);
  console.log(xTrain[0][0].length);

  // console.log({ xTrainLen: xTrain.length, yTrainLen: yTrain.length });
  // console.log({ xTrain });
  // console.log([xTrain[0][1].length, 1]);
  // console.log(xTrain.length);
  // console.log(xTrain[0].length);
  // console.log(xTrain[0][0].length);

  // const xTrain = [xTrainNormal];
  // for (let i = 0; i < xTrain.length; i++) {
  //   console.log(xTrainNormal[i]);
  //   xTrain.push(xTrainNormal[i].map((x) => [x]));
  // }

  // console.log({ xTrain });

  // Train model
  const modelFileName = path.join(__dirname, 'models', `${stockName}.json`);
  let model: Sequential;

  if (fs.existsSync(modelFileName)) {
    console.log(`The ${stockName} model already exists. Loading it...`);
    model = (await tf.loadLayersModel(`file://${modelFileName}/model.json`)) as Sequential;
    console.log(model);
  } else {
    model = tf.sequential();
    model.add(tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [60, 1] }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.lstm({ units: 50, returnSequences: true }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.lstm({ units: 50 }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    // const xs = tf.randomNormal([100, 10]);
    // const ys = tf.randomNormal([100, 1]);
    const xs = tf.tensor3d(xTrain);
    console.log({ xsShape: xs.shape });
    const ys = tf.tensor1d(yTrain);
    console.log({ ysShape: ys.shape });

    await model.fit(xs, ys, {
      epochs: 25,
      batchSize: 32,
      callbacks: {
        onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log?.loss}`),
      },
    });

    await model.save(`file://${modelFileName}`);
    console.log(model);
  }

  // Load stock test data
  // const cryptoCurrency = 'BTC';
  // const againstCurrency = 'USD';
  // const stockName = `${cryptoCurrency}-${againstCurrency}`;

  const testStart = new Date('2020-01-01');
  const testEnd = new Date();

  let testData: StockPrice[];
  const testFileName = path.join(__dirname, 'data', `${stockName}-test.json`);
  if (!fs.existsSync(testFileName)) {
    console.log(`Load test data from Yahoo Finance for ${stockName} stock`);
    testData = await yahooStockPrices.getHistoricalPrices(
      testStart.getMonth(),
      testStart.getDay(),
      testStart.getFullYear(),
      testEnd.getMonth(),
      testEnd.getDay(),
      testEnd.getFullYear(),
      stockName,
      '1d'
    );
    const testDataJson = JSON.stringify(testData);
    fs.writeFileSync(testFileName, testDataJson);
  } else {
    console.log(`Load test data from presaved file for ${stockName} stock...`);
    testData = JSON.parse(fs.readFileSync(testFileName, 'utf-8')) as StockPrice[];
  }
  console.log(`The number of records of test data for ${stockName} stock is ${testData.length}`);

  const actualPrices = testData.map((x) => x.close);
  const totalDataset = closePrices.concat(actualPrices);
  console.log(totalDataset.length);

  // const modelInputs = totalDataset;
  const modelInputs = totalDataset.slice(totalDataset.length - testData.length - predictionDays);
  const modelInputs2 = scaler.fit_transform(modelInputs) as number[];
  const modelInputs3 = modelInputs2.map((x) => [x]);
  console.log(modelInputs3.length, modelInputs3[0].length);
  // const closePrices = testData.map((x) => x.close);
  // console.log(closePrices.slice(10));

  // Make predictions
  const xTestNormal = [];

  for (let i = predictionDays; i < modelInputs3.length; i++) {
    xTestNormal.push(modelInputs3.slice(i - predictionDays, i));
  }

  // Reshaping the test data
  const xTest = [];
  for (let i = 0; i < xTestNormal.length; i++) {
    xTest.push(xTestNormal[i].map((x) => [x]));
  }

  console.log(xTest.length);
  console.log(xTest[0].length);
  console.log(xTest[0][0].length);

  const tfXTrain = tf.tensor3d(xTrain);

  const tfPredictedPricesScaled = model.predict(tfXTrain);
  // @ts-ignore
  const predictedPricesScaled = tfPredictedPricesScaled.dataSync();
  console.log(predictedPricesScaled);
  // @ts-ignore
  // console.log(predictedPricesScaled[1]);
  // console.log(predictedPricesScaled.);
  const predictedPrices = scaler.inverse_transform(predictedPricesScaled);
  console.log(predictedPrices);
})();
