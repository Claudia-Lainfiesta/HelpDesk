import { describe, expect, it } from 'vitest';
import { reportFilters, granularityFor } from '../../src/reports/schemas.js';

describe('rango de reportes', () => {
  it('por defecto incluye hoy y los 29 días UTC anteriores', () => {
    const f = reportFilters({}, new Date('2026-11-15T18:00:00Z'));
    expect(f).toMatchObject({
      from: '2026-10-17T00:00:00.000Z',
      to: '2026-11-15T23:59:59.999Z',
      days: 30,
      timeZone: 'UTC',
    });
  });
  it('acepta fechas reales inclusivas en UTC e instantes de medianoches locales', () => {
    expect(reportFilters({ from: '2026-01-01', to: '2026-12-31' }).days).toBe(365);
    expect(
      reportFilters({
        from: '2026-11-15T06:00:00.000Z',
        to: '2026-11-16T05:59:59.999Z',
        timeZone: 'America/Guatemala',
      }).days,
    ).toBe(1);
  });
  it('no confunde 23/25 horas por cambio horario con dos días', () => {
    for (const [from, to] of [
      ['2026-03-08T05:00:00.000Z', '2026-03-09T03:59:59.999Z'],
      ['2026-11-01T04:00:00.000Z', '2026-11-02T04:59:59.999Z'],
    ])
      expect(reportFilters({ from, to, timeZone: 'America/New_York' }).days).toBe(1);
  });
  it.each([
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-01-01' },
    { to: '2026-01-01' },
    { from: '2026-01-02', to: '2026-01-01' },
    { from: '2026-01-01', to: '2027-01-01' },
    { from: '15/11/2026', to: '2026-11-15' },
    { from: '2026-02-30T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' },
    { timeZone: 'Inventada/Mundo' },
    { categoryId: '0' },
    { agentId: '9223372036854775808' },
    { agentId: '1 OR 1=1' },
    { status: 'cerrado' },
  ])('rechaza un rango o filtro inválido: %j', (query) =>
    expect(() => reportFilters(query)).toThrow(),
  );
  it('elige granularidad en los límites exactos', () => {
    expect([1, 31, 32, 120, 121, 365].map(granularityFor)).toEqual([
      'day',
      'day',
      'week',
      'week',
      'month',
      'month',
    ]);
  });
});
