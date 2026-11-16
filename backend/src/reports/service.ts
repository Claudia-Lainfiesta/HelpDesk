import { transaction } from '../db/transaction.js';
import { ApiError } from '../auth/errors.js';
import * as repository from './repository.js';
import { granularityFor } from './schemas.js';
import type { ReportFilters } from './types.js';
import type { PoolClient } from 'pg';

async function read<T>(
  action: (db: PoolClient) => Promise<T>,
  filters?: ReportFilters,
): Promise<T> {
  return transaction(async (db) => {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    if (filters && !(await repository.filterExists(db, filters)))
      throw new ApiError(400, 'INVALID_INPUT', 'Selecciona una categoría y un agente existentes.');
    return action(db);
  });
}
export const summary = (f: ReportFilters) =>
  read(
    async (db) => ({
      range: { from: f.from, to: f.to, timeZone: f.timeZone },
      filters: { categoryId: f.categoryId ?? null, agentId: f.agentId ?? null },
      kpis: await repository.summary(db, f),
    }),
    f,
  );
export const byStatus = (f: ReportFilters) =>
  read(async (db) => ({ items: await repository.byStatus(db, f) }), f);
export const byPriority = (f: ReportFilters) =>
  read(async (db) => ({ items: await repository.byPriority(db, f) }), f);
export const byCategory = (f: ReportFilters) =>
  read(async (db) => ({ items: await repository.byCategory(db, f) }), f);
export const byAgent = (f: ReportFilters) =>
  read(async (db) => ({ items: await repository.byAgent(db, f) }), f);
export const trend = (f: ReportFilters) =>
  read(async (db) => {
    const granularity = granularityFor(f.days);
    return { granularity, timeZone: f.timeZone, items: await repository.trend(db, f, granularity) };
  }, f);
export const options = () => read(repository.options);
export const exportTickets = (f: ReportFilters) => read((db) => repository.exportTickets(db, f), f);
