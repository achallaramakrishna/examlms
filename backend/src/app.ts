import 'reflect-metadata';
import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import passport from './middleware/passport';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
  app.use(passport.initialize());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv });
  });

  // Question/option diagram images (from scanned-paper ingestion). Served
  // cross-origin since the frontend runs on a different port in dev.
  app.use(
    '/question-images',
    helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
    express.static(path.join(__dirname, '../public/question-images'))
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
