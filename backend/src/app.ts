import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './middleware/requestId.js';
import { applySecurity } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './modules/auth/routes.js';
import basicProfileRouter from './modules/users/basicProfile.service.js';
import healthProfileRouter from './modules/users/healthProfile.service.js';
import dietPreferenceRouter from './modules/users/dietPreference.service.js';
import consentRouter from './modules/consent/service.js';
import inventoryRouter from './modules/inventory/routes.js';
import recommendationRouter from './modules/recommendation/routes.js';
import feedbackRouter from './modules/feedback/routes.js';
import historyRouter from './modules/history/routes.js';
import shoppingRouter from './modules/shopping/routes.js';
import exportRouter from './modules/privacy/exportService.js';
import withdrawRouter from './modules/privacy/withdrawService.js';
import metricsRouter from './observability/metrics.js';
import { httpLogger } from './utils/logger.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(httpLogger);
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  applySecurity(app);

  // routes
  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', basicProfileRouter);
  app.use('/api', healthProfileRouter);
  app.use('/api', dietPreferenceRouter);
  app.use('/api', consentRouter);
  app.use('/api', inventoryRouter);
  app.use('/api', recommendationRouter);
  app.use('/api', feedbackRouter);
  app.use('/api', historyRouter);
  app.use('/api', shoppingRouter);
  app.use('/api', exportRouter);
  app.use('/api', withdrawRouter);
  app.use(metricsRouter);

  app.use(errorHandler);
  return app;
}
