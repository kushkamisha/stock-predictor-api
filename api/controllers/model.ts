import { Request, Response } from 'express';
import { pricePredictor } from '../../model/model';

export const predict = async (req: Request, res: Response) => {
  const { cryptoCurrency, againstCurrency } = req.query;
  if (!cryptoCurrency) {
    res.status(400).send({ type: 'error', msg: 'Crypto currency symbol is not provided' });
  }
  if (!againstCurrency) {
    res.status(400).send({ type: 'error', msg: 'Against currency symbol is not provided' });
  }
  try {
    const price = await pricePredictor(cryptoCurrency as string, againstCurrency as string);
    res.status(200).send({ status: 'success', msg: price });
  } catch (err) {
    console.log(err);
    res.status(500).send((err as Error).message);
  }
};
