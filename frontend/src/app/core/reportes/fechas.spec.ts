import { duracion, fechaValida, fechasRapidas, rangoValido, filtrosUtc } from './fechas';
describe('Fechas y duraciones de reportes', () => {
  it.each([
    [null, 'Sin datos'],
    [0, '0 min'],
    [35, '35 min'],
    [120, '2 h'],
    [155, '2 h 35 min'],
    [1500, '1 d 1 h'],
    [1440, '1 d'],
    [59.8, '1 h'],
  ] as const)('formatea %s: %s', (n, expected) => expect(duracion(n)).toBe(expected));
  it('calcula días civiles incluyendo hoy con cambios de mes/año', () => {
    expect(fechasRapidas(30, new Date(2026, 10, 15, 12))).toEqual({
      from: '2026-10-17',
      to: '2026-11-15',
    });
    expect(fechasRapidas(7, new Date(2026, 0, 2))).toEqual({
      from: '2025-12-27',
      to: '2026-01-02',
    });
    expect(fechasRapidas(90, new Date(2026, 10, 15))).toEqual({
      from: '2026-08-18',
      to: '2026-11-15',
    });
  });
  it('valida fechas reales, orden y límite de 365 días', () => {
    expect(fechaValida('2026-02-30')).toBe(false);
    expect(fechaValida('2028-02-29')).toBe(true);
    expect(rangoValido('2026-01-01', '2026-12-31')).toBe(true);
    expect(rangoValido('2026-01-01', '2027-01-01')).toBe(false);
    expect(rangoValido('2026-01-02', '2026-01-01')).toBe(false);
  });
  it('convierte las medianoches del navegador sin asumir un desfase fijo', () => {
    const f = filtrosUtc({
      range: 'personalizado',
      from: '2026-03-08',
      to: '2026-03-08',
      categoryId: '8',
      agentId: '7',
    });
    expect(f.from).toBe(new Date(2026, 2, 8).toISOString());
    expect(f.to).toBe(new Date(new Date(2026, 2, 9).getTime() - 1).toISOString());
    expect(f.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(f).toMatchObject({ categoryId: '8', agentId: '7' });
  });
});
