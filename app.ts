import express from 'express';
import bodyParser from 'body-parser';
import pingRoutes from './api/routes/ping';
import authRoutes from './api/routes/auth';
import orderRoutes from './api/routes/order';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/ping', pingRoutes);
app.use('/auth', authRoutes);
app.use('/order', orderRoutes);

export { app };
