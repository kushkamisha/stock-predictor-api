import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import scaler from 'minmaxscaler';

// @ts-ignore
import yahooStockPrices, { StockPrice } from 'yahoo-stock-prices';
import { Sequential } from '@tensorflow/tfjs';

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
    fs.writeFileSync(path.join(__dirname, 'data', `${stockName}.json`), trainDataJson);
  } else {
    console.log(`Load from presaved file: ${stockName} stock data`);
    trainData = JSON.parse(fs.readFileSync(trainFileName, 'utf-8')) as StockPrice[];
  }
  console.log(`The number of records of ${stockName} is ${trainData.length}`);
  const closePrices = trainData.map((x) => x.close);
  console.log(closePrices.slice(10));

  // Prepare data
  const scaledClosePrices = scaler.fit_transform(closePrices) as number[];

  const predictionDays = 60;

  const xTrainNormal = []; // [[60 days price], [60 days price], ...]
  const yTrain = [];

  for (let i = predictionDays; i < scaledClosePrices.length; i++) {
    xTrainNormal.push(scaledClosePrices.slice(i - predictionDays, i));
    yTrain.push(scaledClosePrices[i]);
  }

  console.log(xTrainNormal.length);
  console.log(xTrainNormal[0].length);

  // Reshaping the train data
  const xTrain = [];
  for (let i = 0; i < xTrainNormal.length; i++) {
    xTrain.push(xTrainNormal[i].map((x) => [x]));
  }

  console.log(xTrain.length);
  console.log(xTrain[0].length);
  console.log(xTrain[0][0].length);

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

  const closePricesTest = testData.map((x) => x.close);
  console.log({ closePricesTest });

  // Prepare data
  const scaledClosePricesTest = scaler.fit_transform(closePricesTest) as number[];

  const xTestNormal = [];
  const yTest = [];

  for (let i = predictionDays; i < scaledClosePricesTest.length; i++) {
    xTestNormal.push(scaledClosePricesTest.slice(i - predictionDays, i));
    yTest.push(scaledClosePricesTest[i]);
  }

  console.log(xTestNormal.length);
  console.log(xTestNormal[0].length);

  // Reshaping the train data
  const xTest = [];
  for (let i = 0; i < xTestNormal.length; i++) {
    xTest.push(xTestNormal[i].map((x) => [x]));
  }

  console.log(xTest.length);
  console.log(xTest[0].length);
  console.log(xTest[0][0].length);

  const tfXTest = tf.tensor3d(xTest);
  const tfYTest = tf.tensor1d(yTest);

  const tfPredictedPricesScaled = model.predict(tfXTest);
  // @ts-ignore
  const predictedPricesScaled = tfPredictedPricesScaled.dataSync() as number[];
  console.log(predictedPricesScaled);

  const predictedPrices = scaler.inverse_transform(predictedPricesScaled) as number[];
  const yTestNonScaled = scaler.inverse_transform(yTest) as number[];
  console.log({ testLen: predictedPrices.length });
  console.log({ yTest });
  console.log({ predictedPricesScaled });
  const modelErrorScaled = tf.losses.meanSquaredError(tf.tensor1d(predictedPricesScaled), tfYTest);
  modelErrorScaled.print();
  const modelError = tf.losses.meanSquaredError(tf.tensor1d(predictedPrices), yTestNonScaled);
  modelError.print();
})();
