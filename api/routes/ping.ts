import express from 'express';
import { ping } from '../controllers/ping';

const router = express.Router();

router.route('/').get(ping);

export default router;
