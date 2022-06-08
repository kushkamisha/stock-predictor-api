import * as dotenv from 'dotenv';

import { Spot } from '@binance/connector';

dotenv.config();

const { BINANCE_API_KEY, BINANCE_API_SECRET, ENVIRONMENT } = process.env;

const client = new Spot(BINANCE_API_KEY || '', BINANCE_API_SECRET || '', {
  baseURL: ENVIRONMENT === 'dev' ? 'https://testnet.binance.vision' : 'https://api.binance.com',
});

export const newOrder = () => {
  // // Get account information
  // client.account().then((response) => client.logger.log(response.data));
  // // Place a new order
  // client
  //   .newOrder('BNBUSDT', 'BUY', 'LIMIT', {
  //     price: '350',
  //     quantity: 1,
  //     timeInForce: 'GTC',
  //   })
  //   .then((response) => client.logger.log(response.data))
  //   .catch((error) => client.logger.error(error));
};
