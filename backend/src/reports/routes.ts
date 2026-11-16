import { Router } from 'express';
import { requireRole } from '../auth/middlewares.js';
import * as controller from './controller.js';
export const reportsRouter = Router();
reportsRouter.use(requireRole('supervisor', 'administrador'));
reportsRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
reportsRouter.get('/summary', controller.summary);
reportsRouter.get('/by-status', controller.byStatus);
reportsRouter.get('/by-priority', controller.byPriority);
reportsRouter.get('/by-category', controller.byCategory);
reportsRouter.get('/trend', controller.trend);
reportsRouter.get('/by-agent', controller.byAgent);
reportsRouter.get('/options', controller.options);
reportsRouter.get('/export.csv', controller.exportCsv);
