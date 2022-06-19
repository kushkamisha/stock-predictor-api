import express from 'express';
import { exchangeInfo, newOrder } from '../controllers/order';

const router = express.Router();

router.route('/info').get(exchangeInfo);
router.route('/new').post(newOrder);

export default router;
