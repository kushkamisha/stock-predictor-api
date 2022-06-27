import express from 'express';
import { predict } from '../controllers/model';

const router = express.Router();

router.route('/predict').get(predict);

export default router;
