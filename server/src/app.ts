import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { routes } from './routes';
import { errorHandler, notFound } from './middleware/error';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));
if (!config.isProd) app.use(morgan('dev'));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
