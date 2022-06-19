import express from 'express';
import { register } from '../controllers/auth';

const router = express.Router();

router.route('/register').post(register);

// router.route('/login').post(auth.login);

export default router;
