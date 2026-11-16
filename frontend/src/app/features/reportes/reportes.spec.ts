import { notificacionesSinRed } from '../../pruebas/notificaciones';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, convertToParamMap } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth/auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';
import { reportesPrueba, opcionesReportesPrueba } from '../../pruebas/reportes';
import { Reports } from '../../core/reportes/modelos';
import { Reportes, leerVista, barrasCategorias } from './reportes';
import { fechasRapidas } from '../../core/reportes/fechas';
import { Rol } from '../../core/auth/modelos';
describe('Pantalla Reportes', () => {
  let http: HttpTestingController, pagina: RouterTestingHarness, c: Reportes;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        notificacionesSinRed,
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function abrir(url = '/reportes', role: Rol = 'supervisor') {
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({ ...usuarioPrueba, role });
    pagina = await RouterTestingHarness.create(url);
    c = pagina.fixture.debugElement.query(By.directive(Reportes))?.componentInstance;
  }
  function responder(data: Reports = reportesPrueba) {
    http.expectOne('/api/reports/options').flush(opcionesReportesPrueba);
    for (const [path, key] of [
      ['summary', 'summary'],
      ['by-status', 'statuses'],
      ['by-priority', 'priorities'],
      ['by-category', 'categories'],
      ['trend', 'trend'],
      ['by-agent', 'agents'],
    ] as const)
      http.expectOne((r) => r.url === `/api/reports/${path}`).flush(data[key]);
    pagina.detectChanges();
  }
  it('carga 30 días incluyendo hoy, con indicadores, barras, ceros y tablas textuales accesibles', async () => {
    await abrir();
    expect(c.vista()).toMatchObject({ range: '30', ...fechasRapidas(30) });
    expect(pagina.routeNativeElement!.textContent).toContain('Cargando reportes');
    responder();
    await pagina.fixture.whenStable();
    const e = pagina.routeNativeElement!;
    expect(e.textContent).toContain('Tickets creados');
    expect(e.textContent).toContain('2 h 35 min');
    expect(e.textContent).toContain('1 d 1 h');
    expect(e.textContent).toContain('Fotografía actual');
    expect(e.textContent).toContain('Tickets por estado');
    expect(e.textContent).toContain('Urgente');
    expect(e.textContent).toContain('Categoría anterior (inactiva)');
    expect(e.textContent).toContain('Juan Pérez');
    expect(e.textContent).toContain('Agente anterior');
    expect(e.textContent).toContain('Sin datos');
    expect(e.querySelectorAll('app-barras-reporte li')).toHaveLength(12);
    expect(e.querySelectorAll('table caption')).toHaveLength(2);
    expect(e.querySelectorAll('th[scope="col"]')).toHaveLength(10);
    for (const tabla of e.querySelectorAll('table')) {
      expect(tabla.classList.contains('tabla-reporte')).toBe(true);
      expect(tabla.className).not.toMatch(/min-w-/);
      for (const celda of tabla.querySelectorAll('tbody td'))
        expect(celda.querySelector('span[aria-hidden="true"]')?.textContent?.trim()).toBeTruthy();
    }
    expect(e.querySelector('.overflow-x-auto')).toBeNull();
    for (const select of e.querySelectorAll('select'))
      expect(e.querySelector(`label[for="${select.id}"]`)).not.toBeNull();
    const dates = e.querySelectorAll('input[type=date]');
    expect(dates).toHaveLength(2);
  });
  it.each(['7', '30', '90'] as const)(
    'aplica rango rápido %s y URL sin instantes extensos',
    async (range) => {
      await abrir();
      responder();
      c.formulario.controls.range.setValue(range);
      c.aplicar();
      await pagina.fixture.whenStable();
      expect(c.vista()).toMatchObject({ range, ...fechasRapidas(Number(range)) });
      expect(TestBed.inject(Router).url).toContain(`range=${range}`);
      responder();
    },
  );
  it('restaura fechas/categoría/agente desde URL y conserva filtros en recarga', async () => {
    await abrir(
      '/reportes?range=personalizado&from=2026-01-01&to=2026-01-07&categoryId=9&agentId=10',
    );
    expect(c.formulario.getRawValue()).toEqual({
      range: 'personalizado',
      from: '2026-01-01',
      to: '2026-01-07',
      categoryId: '9',
      agentId: '10',
    });
    const reqs = http.match(
      (r) => r.url.startsWith('/api/reports/') && r.url !== '/api/reports/options',
    );
    for (const r of reqs) {
      expect(r.request.params.get('categoryId')).toBe('9');
      expect(r.request.params.get('agentId')).toBe('10');
      r.flush(
        reportesPrueba[
          r.request.url.endsWith('summary')
            ? 'summary'
            : r.request.url.endsWith('trend')
              ? 'trend'
              : r.request.url.endsWith('by-status')
                ? 'statuses'
                : r.request.url.endsWith('by-priority')
                  ? 'priorities'
                  : r.request.url.endsWith('by-category')
                    ? 'categories'
                    : 'agents'
        ],
      );
    }
    http.expectOne('/api/reports/options').flush(opcionesReportesPrueba);
    await pagina.fixture.whenStable();
    c.recargar.next();
    responder();
    expect(TestBed.inject(Router).url).toContain('categoryId=9');
  });
  it('espera Aplicar; valida personalizado y cambia fechas a personalizado sin consultas intermedias', async () => {
    await abrir();
    responder();
    c.formulario.patchValue({
      from: '2026-02-30',
      to: '2026-03-01',
      categoryId: '8',
      agentId: '7',
    });
    c.aplicar();
    expect(c.errorFechas()).toContain('365 días');
    http.expectNone((r) => r.url.startsWith('/api/reports'));
    c.formulario.patchValue({ from: '2026-01-01', to: '2026-01-07' });
    expect(c.formulario.controls.range.value).toBe('personalizado');
    c.aplicar();
    await pagina.fixture.whenStable();
    responder();
    expect(TestBed.inject(Router).url).toContain('agentId=7');
  });
  it('cancela peticiones obsoletas y presenta una sola carga agregada', async () => {
    await abrir();
    const previous = http.match((r) => r.url.startsWith('/api/reports/'));
    expect(previous).toHaveLength(7);
    c.formulario.controls.range.setValue('7');
    c.aplicar();
    await pagina.fixture.whenStable();
    expect(previous.every((r) => r.cancelled)).toBe(true);
    responder();
    expect(c.cargando()).toBe(false);
  });
  it('muestra un solo error y permite reintentar', async () => {
    await abrir();
    const pending = http.match((r) => r.url.startsWith('/api/reports/'));
    pending[0]!.flush(
      { error: { code: 'INTERNAL_ERROR', message: 'Error' } },
      { status: 500, statusText: 'Error' },
    );
    await pagina.fixture.whenStable();
    expect(pending.slice(1).every((r) => r.cancelled)).toBe(true);
    expect(pagina.routeNativeElement!.querySelectorAll('[role=alert]')).toHaveLength(1);
    expect(pagina.routeNativeElement!.textContent).toContain('No fue posible cargar los reportes.');
    Array.from(pagina.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    responder();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('Actividad por agente');
  });
  it('rango sin eventos mantiene snapshot y explica ausencia de datos, con ceros y promedios nulos', async () => {
    await abrir();
    const empty = structuredClone(reportesPrueba);
    empty.summary.kpis = {
      created: 0,
      resolved: 0,
      closed: 0,
      canceled: 0,
      pendingNow: 8,
      averageResolutionMinutes: null,
      averageCloseMinutes: null,
    };
    empty.statuses.items.forEach((i) => (i.count = 0));
    empty.priorities.items.forEach((i) => (i.count = 0));
    empty.categories.items = [];
    empty.agents.items = [];
    responder(empty);
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain(
      'No hay datos para los filtros seleccionados',
    );
    expect(pagina.routeNativeElement!.textContent).toContain('Sin datos');
    expect(c.datos()!.summary.kpis.pendingNow).toBe(8);
    expect(pagina.routeNativeElement!.querySelector('app-barras-reporte')).toBeNull();
  });
  it.each(['solicitante', 'agente'] as const)(
    'deniega ruta a %s sin consultar reportes',
    async (role) => {
      await abrir('/reportes', role);
      expect(TestBed.inject(Router).url).toBe('/sin-permiso');
      http.expectNone((r) => r.url.startsWith('/api/reports/'));
    },
  );
  it('permite administrador y mantiene navegación Reportes', async () => {
    await abrir('/reportes', 'administrador');
    responder();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.querySelector('a[href="/reportes"]')).not.toBeNull();
    expect(pagina.routeNativeElement!.textContent).toContain('Exportar CSV');
  });
  it('descarga CSV con filtros aplicados, bloquea duplicados y libera el Blob', async () => {
    await abrir(
      '/reportes?range=personalizado&from=2026-01-01&to=2026-01-07&categoryId=9&agentId=10',
    );
    responder();
    c.formulario.controls.categoryId.setValue('99');
    const crearOriginal = URL.createObjectURL,
      revocarOriginal = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:csv-prueba');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('helpdesk-reporte-2026-01-01-a-2026-01-07.csv');
      expect(this.href).toBe('blob:csv-prueba');
    });
    try {
      c.exportar();
      c.exportar();
      pagina.detectChanges();
      expect(c.exportando()).toBe(true);
      const button = Array.from(pagina.routeNativeElement!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Exportando...'),
      )!;
      expect(button.disabled).toBe(true);
      const req = http.expectOne((r) => r.url === '/api/reports/export.csv');
      expect(req.request.params.get('categoryId')).toBe('9');
      expect(req.request.params.get('agentId')).toBe('10');
      req.flush(new Blob(['Ticket\r\n'], { type: 'text/csv' }), {
        headers: {
          'Content-Disposition':
            'attachment; filename="helpdesk-reporte-2026-01-01-a-2026-01-07.csv"',
        },
      });
      expect(c.exportando()).toBe(false);
      expect(click).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-prueba');
      expect(document.querySelector('a[download]')).toBeNull();
    } finally {
      URL.createObjectURL = crearOriginal;
      URL.revokeObjectURL = revocarOriginal;
      click.mockRestore();
    }
  });
  it('error de exportación conserva los reportes y muestra toast saneado', async () => {
    await abrir();
    responder();
    c.exportar();
    http
      .expectOne((r) => r.url === '/api/reports/export.csv')
      .flush(new Blob(['Error privado']), { status: 500, statusText: 'Error' });
    await pagina.fixture.whenStable();
    expect(c.exportando()).toBe(false);
    expect(c.datos()).not.toBeNull();
    expect(pagina.routeNativeElement!.textContent).toContain('No fue posible exportar el reporte.');
    expect(pagina.routeNativeElement!.textContent).not.toContain('Error privado');
  });
  it('normaliza parámetros inválidos y agrupa Otras sin perder cantidades', () => {
    expect(
      leerVista(
        convertToParamMap({ range: '100', from: 'error', to: 'otro', agentId: '0' }),
        new Date(2026, 10, 15),
      ),
    ).toEqual({ range: '30', from: '2026-10-17', to: '2026-11-15', agentId: '', categoryId: '' });
    const items = Array.from({ length: 12 }, (_, i) => ({
      category: { id: String(i), name: `Categoría ${i}`, isActive: true },
      count: 12 - i,
    }));
    const barras = barrasCategorias(items);
    expect(barras).toHaveLength(11);
    expect(barras[10]).toMatchObject({ etiqueta: 'Otras', cantidad: 3 });
    expect(barras.reduce((n, i) => n + i.cantidad, 0)).toBe(items.reduce((n, i) => n + i.count, 0));
  });
});
