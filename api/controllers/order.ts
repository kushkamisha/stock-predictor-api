import { Spot } from '@binance/connector';
import { left, right } from '@sweet-monads/either';
import { Request, Response } from 'express';
import errorsRegistry from '../../errorsRegistry';

const { BINANCE_API_KEY, BINANCE_API_SECRET, ENVIRONMENT } = process.env;
const baseURL =
  ENVIRONMENT === 'dev' ? 'https://testnet.binance.vision' : 'https://api.binance.com';

const exchange = new Spot(BINANCE_API_KEY || '', BINANCE_API_SECRET || '', { baseURL });
// // Get account information
//   // exchange.account().then((response) => exchange.logger.log(response.data))
//   try {
//     // @ts-ignore
//     const res = await exchange.account();
//     return res;
//   } catch (err) {
//     return left({ type: errorsRegistry.binance.order, msg: (err as Error).message });
//   }

// TODO: use directly API https://api.binance.com/api/v3/exchangeInfo?symbol=BNBBTC"
// TODO: use custom http requestor to interact with API
// TODO: get error message from API and return it to the client
export const exchangeInfo = async (req: Request, res: Response) => {
  const { symbol } = req.query;
  if (!symbol) {
    res.status(400).send({ type: 'error', msg: 'Symbol is not provided' });
  }
  try {
    const response = await exchange
      // @ts-ignore
      .exchangeInfo({ symbol });
    // const response = https://api.binance.com/api/v3/exchangeInfo?symbol=BNBBTC"
    if (response.status === 200) {
      res.status(200).send({ type: 'success', msg: response.data });
      console.log(response.data);
    } else {
      // error
      res /* .status(response.status) */
        .send(response.msg);
    }
    // return left({ type: errorsRegistry.binance.order, msg: response.statusText });
  } catch (err) {
    // return left({ type: errorsRegistry.binance.order, msg: (err as Error).message });
    console.log(err);
    res.status(500).send((err as Error).message);
  }
};

export const newOrder = async (req: Request, res: Response) => {
  const pair = 'BNBUSDT';
  try {
    const response = await exchange
      // @ts-ignore
      .newOrder(pair, 'BUY', 'LIMIT', {
        price: '350',
        quantity: 1,
        timeInForce: 'GTC',
      });
    if (response.status === 200) {
      res.status(200).send(`Successfully placed ${pair} order`);
      // return right(response.data);
    }
    res.status(response.status);
    // return left({ type: errorsRegistry.binance.order, msg: response.statusText });
  } catch (err) {
    // return left({ type: errorsRegistry.binance.order, msg: (err as Error).message });
    res.status(500).send((err as Error).message);
  }
};
