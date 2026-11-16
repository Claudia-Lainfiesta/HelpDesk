import type { RequestHandler } from 'express';
import { reportFilters } from './schemas.js';
import type { ReportFilters } from './types.js';
import * as service from './service.js';
import { exportFilename, ticketsCsv } from './csv.js';
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
export const exportCsv: RequestHandler = async (req, res) => {
  const filters = reportFilters(req.query);
  const csv = ticketsCsv(await service.exportTickets(filters));
  res.set('Content-Disposition', `attachment; filename="${exportFilename(filters)}"`);
  res.type('text/csv; charset=utf-8').send(csv);
};
