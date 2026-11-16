import type { RequestHandler } from 'express';
import { reportFilters } from './schemas.js';
import type { ReportFilters } from './types.js';
import * as service from './service.js';
const report =
  (load: (f: ReportFilters) => Promise<unknown>): RequestHandler =>
  async (req, res) => {
    res.json(await load(reportFilters(req.query)));
  };
export const summary = report(service.summary);
export const byStatus = report(service.byStatus);
export const byPriority = report(service.byPriority);
export const byCategory = report(service.byCategory);
export const trend = report(service.trend);
export const byAgent = report(service.byAgent);
export const options: RequestHandler = async (_req, res) => {
  res.json(await service.options());
};
