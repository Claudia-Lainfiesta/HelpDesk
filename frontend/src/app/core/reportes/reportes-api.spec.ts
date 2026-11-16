import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportesApi } from './reportes-api';
import { Reports } from './modelos';
import { reportesPrueba, opcionesReportesPrueba } from '../../pruebas/reportes';
describe('ReportesApi', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envía fechas UTC, zona y filtros a las seis consultas y agrega respuestas tipadas', () => {
    let resultado: Reports | undefined;
    const f = {
      from: '2026-10-17T06:00:00.000Z',
      to: '2026-11-16T05:59:59.999Z',
      timeZone: 'America/Guatemala',
      categoryId: '8',
      agentId: '7',
    };
    TestBed.inject(ReportesApi)
      .cargar(f)
      .subscribe((r) => (resultado = r));
    for (const [path, key] of [
      ['summary', 'summary'],
      ['by-status', 'statuses'],
      ['by-priority', 'priorities'],
      ['by-category', 'categories'],
      ['trend', 'trend'],
      ['by-agent', 'agents'],
    ] as const) {
      const r = http.expectOne((req) => req.url === `/api/reports/${path}`);
      expect(r.request.method).toBe('GET');
      for (const [k, v] of Object.entries(f)) expect(r.request.params.get(k)).toBe(v);
      r.flush(reportesPrueba[key]);
    }
    expect(resultado).toEqual(reportesPrueba);
  });
  it('omite filtros vacíos y ofrece opciones mínimas por un endpoint propio', () => {
    TestBed.inject(ReportesApi)
      .opciones()
      .subscribe((o) => expect(o).toEqual(opcionesReportesPrueba));
    http.expectOne('/api/reports/options').flush(opcionesReportesPrueba);
    TestBed.inject(ReportesApi)
      .cargar({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T23:59:59.999Z', timeZone: 'UTC' })
      .subscribe();
    const reqs = http.match((r) => r.url.startsWith('/api/reports/'));
    expect(reqs).toHaveLength(6);
    for (const r of reqs) {
      expect(r.request.params.has('categoryId')).toBe(false);
      expect(r.request.params.has('agentId')).toBe(false);
      r.flush({});
    }
  });
});
