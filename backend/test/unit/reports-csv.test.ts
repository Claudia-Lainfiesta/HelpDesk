import { describe, expect, it } from 'vitest';
import {
  csvCell,
  csvHeaders,
  duration,
  exportFilename,
  ticketsCsv,
} from '../../src/reports/csv.js';
import type { ExportTicket } from '../../src/reports/types.js';

describe('CSV de reportes', () => {
  it.each(['=SUM(1,2)', '+1', '-1', '@SUM(A1)', ' \t=1', '\r\n+1', '\u200B@1'])(
    'neutraliza fórmulas incluso tras controles: %j',
    (value) => {
      expect(csvCell(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
    },
  );
  it('escapa comillas, comas y saltos sin alterar texto normal', () => {
    expect(csvCell('José, "María"\nCategoría')).toBe('"José, ""María""\nCategoría"');
    expect(csvCell('Equipo - oficina')).toBe('"Equipo - oficina"');
  });
  it('exporta trece columnas, BOM, CRLF, fechas UTC y duraciones; vacío solo tiene encabezado', () => {
    expect(ticketsCsv([])).toBe('\uFEFF' + csvHeaders.map(csvCell).join(',') + '\r\n');
    expect(csvHeaders).toHaveLength(13);
    const ticket: ExportTicket = {
      number: 'TK-000042',
      subject: 'Error, "Sistema A"\nSegunda línea',
      category: '=1+1',
      status: 'resuelto',
      priority: 'alta',
      requester: '+José',
      agent: '@María',
      createdAt: new Date('2026-11-16T14:30:00Z'),
      resolvedAt: new Date('2026-11-16T17:05:00Z'),
      closedAt: null,
      canceledAt: null,
      resolutionMinutes: 155,
      closeMinutes: null,
    };
    const csv = ticketsCsv([ticket]);
    expect(csv).toContain(
      '"TK-000042","Error, ""Sistema A""\nSegunda línea","\'=1+1","Resuelto","Alta","\'+José","\'@María"',
    );
    expect(csv).toContain(
      '"2026-11-16 14:30:00 UTC","2026-11-16 17:05:00 UTC","","","2 h 35 min",""',
    );
    expect(csv.endsWith('\r\n')).toBe(true);
    expect([null, 0, 35, 120, 155, 1500].map(duration)).toEqual([
      '',
      '0 min',
      '35 min',
      '2 h',
      '2 h 35 min',
      '1 d 1 h',
    ]);
  });
  it('nombra el archivo con las fechas civiles del rango sin aceptar rutas arbitrarias', () => {
    expect(
      exportFilename({
        from: '2026-10-18T06:00:00.000Z',
        to: '2026-11-17T05:59:59.999Z',
        timeZone: 'America/Guatemala',
      }),
    ).toBe('helpdesk-reporte-2026-10-18-a-2026-11-16.csv');
  });
});
