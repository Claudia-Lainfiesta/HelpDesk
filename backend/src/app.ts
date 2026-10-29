import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './auth/routes.js';
import { attachSession } from './auth/session.js';
import { csrfProtection, enforcePasswordChange } from './auth/middlewares.js';
import type { AuthConfig } from './auth/config.js';
import { usersRouter } from './users/routes.js';
import { categoriesRouter } from './categories/routes.js';
import type { UserConfig } from './users/config.js';

export function createApp(config: AuthConfig & Partial<UserConfig> = env) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, origin === config.frontendOrigin),
      credentials: true,
    }),
  );
  app.use(csrfProtection(config));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRouter);
  app.use(attachSession(config));
  app.use(enforcePasswordChange);
  app.use('/api/auth', authRouter(config));
  app.use(
    '/api/users',
    usersRouter({
      tempAccountDefaultDays: config.tempAccountDefaultDays ?? 7,
      tempAccountMaxDays: config.tempAccountMaxDays ?? 30,
    }),
  );
  app.use('/api/categories', categoriesRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
