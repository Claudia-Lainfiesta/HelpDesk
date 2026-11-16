import { z } from 'zod';
import { idSchema, input } from '../http/validation.js';
import { ApiError } from '../auth/errors.js';
import type { Granularity, ReportFilters } from './types.js';

const date = z.union([z.iso.date(), z.iso.datetime({ precision: 3 })]);
const querySchema = z
  .object({
    from: date.optional(),
    to: date.optional(),
    categoryId: idSchema.optional(),
    agentId: idSchema.optional(),
    timeZone: z
      .string()
      .min(1)
      .max(100)
      .default('UTC')
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }),
  })
  .strict();

function civilDay(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (kind: string) => Number(parts.find((p) => p.type === kind)!.value);
  return Date.UTC(value('year'), value('month') - 1, value('day')) / 86400000;
}

export function reportFilters(query: unknown, now = new Date()): ReportFilters {
  const parsed = input(querySchema, query);
  const invalid = () =>
    new ApiError(
      400,
      'INVALID_INPUT',
      'Indica un rango válido de hasta 365 días, con Desde y Hasta.',
    );
  if ((parsed.from === undefined) !== (parsed.to === undefined)) throw invalid();
  const defaultStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
  );
  const defaultEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - 1,
  );
  const from = parsed.from
    ? new Date(parsed.from.length === 10 ? `${parsed.from}T00:00:00.000Z` : parsed.from)
    : defaultStart;
  const to = parsed.to
    ? new Date(parsed.to.length === 10 ? `${parsed.to}T23:59:59.999Z` : parsed.to)
    : defaultEnd;
  const days = civilDay(to, parsed.timeZone) - civilDay(from, parsed.timeZone) + 1;
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    from > to ||
    days > 365 ||
    days < 1
  )
    throw invalid();
  return { ...parsed, from: from.toISOString(), to: to.toISOString(), days };
}

export const granularityFor = (days: number): Granularity =>
  days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
