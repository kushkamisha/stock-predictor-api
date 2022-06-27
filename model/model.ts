import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import scaler from 'minmaxscaler';

// @ts-ignore
import yahooStockPrices, { StockPrice } from 'yahoo-stock-prices';
import { Sequential } from '@tensorflow/tfjs';

const loadData = async (stockName: string, start: Date, end: Date) => {
  let data: StockPrice[];
  const filename = `${stockName} (from ${start.toDateString()} to ${end.toDateString()}).json`;
  const trainFileName = path.join(__dirname, 'data', filename);

  if (!fs.existsSync(trainFileName)) {
    console.log(`Load from Yahoo Finance: ${stockName} stock data`);
    data = await yahooStockPrices.getHistoricalPrices(
      start.getMonth(),
      start.getDay(),
      start.getFullYear(),
      end.getMonth(),
      end.getDay(),
      end.getFullYear(),
      stockName,
      '1d'
    );
    const dataJson = JSON.stringify(data);
    fs.writeFileSync(trainFileName, dataJson);
    console.log('The file was successfully saved');
  } else {
    console.log(`Load from presaved file: ${stockName} stock data`);
    data = JSON.parse(fs.readFileSync(trainFileName, 'utf-8')) as StockPrice[];
  }
  console.log(`The number of records of ${stockName} is ${data.length}`);
  return data.map((x) => x.close); // close prices
};

const prepareData = (predictionDays: number, prices: number[]): [number[][][], number[]] => {
  // Scale prices
  const scaledPrices = scaler.fit_transform(prices) as number[];

  const xNormal = []; // [[<predictionDays> days price], [<predictionDays> days price], ...]
  const y = [];

  for (let i = predictionDays; i < scaledPrices.length; i++) {
    xNormal.push(scaledPrices.slice(i - predictionDays, i));
    y.push(scaledPrices[i]);
  }

  // Reshaping prices
  const x = [];
  for (let i = 0; i < xNormal.length; i++) {
    x.push(xNormal[i].map((close) => [close]));
  }
  return [x, y];
};

const makeTensors = (x: number[][][], y: number[]): [tf.Tensor3D, tf.Tensor1D] => {
  const xTensor = tf.tensor3d(x);
  const yTensor = tf.tensor1d(y);
  return [xTensor, yTensor];
};

const trainModel = async (xTensor: tf.Tensor3D, yTensor: tf.Tensor1D) => {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [60, 1] }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.lstm({ units: 50, returnSequences: true }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.lstm({ units: 50 }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  await model.fit(xTensor, yTensor, {
    epochs: 25,
    batchSize: 32,
    callbacks: {
      onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log?.loss}`),
    },
  });

  return model;
};

const loadDataAndTrainModel = async (
  stockName: string,
  predictionDays: number,
  start: Date,
  end: Date
) => {
  // Load train data
  const trainPrices = await loadData(stockName, start, end);

  // Prepare data
  const [xTrain, yTrain] = prepareData(predictionDays, trainPrices);

  // Train model
  const modelFileName = path.join(__dirname, 'models', `${stockName}.json`);
  let model: Sequential;
  const [xTensorTrain, yTensorTrain] = makeTensors(xTrain, yTrain);

  if (fs.existsSync(modelFileName)) {
    // Load trained model from file
    console.log(`The ${stockName} model already exists. Loading it...`);
    model = (await tf.loadLayersModel(`file://${modelFileName}/model.json`)) as Sequential;
  } else {
    // Train the model & safe to the file
    model = await trainModel(xTensorTrain, yTensorTrain);
    await model.save(`file://${modelFileName}`);
  }

  return model;
};

const testModel = async (
  stockName: string,
  predictionDays: number,
  start: Date,
  end: Date,
  model: tf.Sequential
) => {
  // Load stock test data
  const testPrices = await loadData(stockName, start, end);
  // Prepare data
  const [xTest, yTest] = prepareData(predictionDays, testPrices);
  const [xTensorTest, yTensorTest] = makeTensors(xTest, yTest);
  const tfPredictedPricesScaled = model.predict(xTensorTest);
  // @ts-ignore
  const predictedPricesScaled = tfPredictedPricesScaled.dataSync() as number[];
  const predictedPrices = scaler.inverse_transform(predictedPricesScaled) as number[];
  const yTestNonScaled = scaler.inverse_transform(yTest) as number[];
  const modelErrorScaled = tf.losses.meanSquaredError(
    tf.tensor1d(predictedPricesScaled),
    yTensorTest
  );
  modelErrorScaled.print();
  const modelError = tf.losses.meanSquaredError(tf.tensor1d(predictedPrices), yTestNonScaled);
  modelError.print();
};

const predictTomorrowPrice = async (
  end: Date,
  stockName: string,
  predictionDays: number,
  model: tf.Sequential
) => {
  const start = new Date();
  start.setDate(start.getDate() - predictionDays - 2);

  // Load stock test data
  const prices = await loadData(stockName, start, end);

  // Prepare data
  const [xTest, yTest] = prepareData(predictionDays, prices);
  const [xTensorTest] = makeTensors(xTest, yTest);

  const tfPredictedPricesScaled = model.predict(xTensorTest);
  // @ts-ignore
  const predictedPricesScaled = tfPredictedPricesScaled.dataSync() as number[];

  const predictedPrices = scaler.inverse_transform(predictedPricesScaled) as number[];
  // const yTestNonScaled = scaler.inverse_transform(yTest) as number[];
  return predictedPrices[0]; // tomorrow's price
};

const pricePredictor = async () => {
  const cryptoCurrency = 'BTC';
  const againstCurrency = 'USD';
  const stockName = `${cryptoCurrency}-${againstCurrency}`;
  const predictionDays = 60;

  /**
   * Model training
   */
  const trainStart = new Date('2017-01-01');
  const trainEnd = new Date('2021-01-01');
  const model = await loadDataAndTrainModel(stockName, predictionDays, trainStart, trainEnd);

  /**
   * Model testing
   */
  // const testStart = new Date('2020-01-01');
  // const testEnd = new Date();
  // await testModel(stockName, predictionDays, testStart, testEnd, model);

  /**
   * Predict tomorrow's price
   */
  const today = new Date(); // today
  const price = await predictTomorrowPrice(today, stockName, predictionDays, model);
  console.log({ price });
};

pricePredictor();
