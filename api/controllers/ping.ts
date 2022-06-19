import { Request, Response } from 'express';

export const ping = (_: Request, res: Response) => {
  res.send('pong');
};
