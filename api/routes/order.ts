import express from 'express';
import { newOrder } from '../controllers/order';

const router = express.Router();

router.route('/newOrder').post(newOrder);

module.exports = router;
