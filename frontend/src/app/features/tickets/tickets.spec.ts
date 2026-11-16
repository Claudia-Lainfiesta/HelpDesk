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
import { categoriaPrueba } from '../../pruebas/administracion';
import { Ticket } from '../../core/tickets/tickets-api';
import { Tickets, leerFiltrosTickets } from './tickets';
import { DetalleTicket } from './detalle-ticket';
import { FormularioTicket } from './formulario-ticket';
import { Avisos } from '../../shared/ui/aviso-flotante';
const ticket: Ticket = {
  id: '123',
  number: 'TK-000123',
  subject: 'Impresora',
  description: 'Primera línea\n<img src=x onerror=alert(1)>',
  status: 'creado',
  priority: 'media',
  attachment: null,
  category: { id: '8', name: 'Hardware' },
  requester: { id: '5', fullName: 'Ana', email: 'ana@example.invalid' },
  assignedAgent: null,
  createdAt: '2026-11-06T19:00:00.000Z',
  updatedAt: '2026-11-06T19:00:00.000Z',
  resolvedAt: null,
  closedAt: null,
  canceledAt: null,
};
describe('Tickets y detalle', () => {
  let http: HttpTestingController;
  let pagina: RouterTestingHarness;
  let c: Tickets;
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
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(usuarioPrueba);
  });
  afterEach(() => http.verify());
  async function abrir(url = '/tickets') {
    pagina = await RouterTestingHarness.create(url);
    c = pagina.fixture.debugElement.query(By.directive(Tickets)).componentInstance;
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [categoriaPrueba()] });
  }
  function lista(data: Ticket[] = [ticket], total = data.length) {
    http
      .expectOne((r) => r.url === '/api/tickets')
      .flush({ data, total, page: c.filtros().page, pageSize: c.filtros().pageSize });
    pagina.detectChanges();
  }
  it('carga y presenta datos reales con enlace accesible, estado y agente sin asignar', async () => {
    await abrir();
    expect(pagina.routeNativeElement!.textContent).toContain('Cargando tickets');
    lista();
    await pagina.fixture.whenStable();
    const e = pagina.routeNativeElement!;
    const fila = e.querySelector<HTMLButtonElement>('button[data-ticket="123"]')!;
    expect(fila.getAttribute('aria-label')).toContain('Ver ticket TK-000123');
    expect(fila.getAttribute('aria-pressed')).toBe('false');
    expect(fila.getAttribute('aria-controls')).toBe('panel-vista-ticket');
    for (const texto of ['Impresora', 'Hardware', 'Sin asignar', 'Creado', 'Media'])
      expect(fila.textContent).toContain(texto);
    expect(e.querySelector('#panel-vista-ticket')?.textContent).toContain('Selecciona un ticket');
    expect(e.textContent).toContain('Creado');
    expect(e.querySelector('app-insignia-prioridad')?.textContent).toContain('Media');
  });
  it('selecciona sin navegar, cambia el panel y vuelve a la lista conservando foco y filtros', async () => {
    await abrir('/tickets?priority=media&categoryId=8');
    const otro = { ...ticket, id: '124', number: 'TK-000124', subject: 'Otro asunto' };
    lista([ticket, otro]);
    const e = pagina.routeNativeElement!;
    e.querySelector<HTMLButtonElement>('button[data-ticket="123"]')!.click();
    await pagina.fixture.whenStable();
    http.expectOne('/api/tickets/123').flush(ticket);
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data: [], total: 0, page: 1, pageSize: 50 });
    await pagina.fixture.whenStable();
    expect(e.querySelector('#panel-vista-ticket')?.textContent).toContain(ticket.description);
    expect(e.querySelector('button[data-ticket="123"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(TestBed.inject(Router).url).toBe('/tickets?priority=media&categoryId=8');
    expect(e.querySelector('a[href="/tickets/123"]')?.textContent).toContain(
      'Abrir detalle completo',
    );
    e.querySelector<HTMLButtonElement>('button[data-ticket="124"]')!.click();
    await pagina.fixture.whenStable();
    http.expectOne('/api/tickets/124').flush(otro);
    http
      .expectOne('/api/tickets/124/events?page=1&pageSize=50')
      .flush({ data: [], total: 0, page: 1, pageSize: 50 });
    await pagina.fixture.whenStable();
    expect(e.querySelector('#panel-vista-ticket')?.textContent).toContain('Otro asunto');
    expect(e.querySelector('#panel-vista-ticket')?.textContent).not.toContain('TK-000123');
    c.volverALista();
    await pagina.fixture.whenStable();
    expect(c.seleccionado()).toBeNull();
    expect(document.activeElement).toBe(e.querySelector('button[data-ticket="124"]'));
    expect(TestBed.inject(Router).url).toContain('priority=media');
  });
  it('cancela la lectura de una selección obsoleta y quita la selección si sale del filtro', async () => {
    await abrir();
    lista([ticket, { ...ticket, id: '124' }]);
    c.seleccionar('123');
    await pagina.fixture.whenStable();
    const anterior = http.expectOne('/api/tickets/123');
    c.seleccionar('124');
    await pagina.fixture.whenStable();
    expect(anterior.cancelled).toBe(true);
    http.expectOne('/api/tickets/124').flush({ ...ticket, id: '124' });
    http
      .expectOne('/api/tickets/124/events?page=1&pageSize=50')
      .flush({ data: [], total: 0, page: 1, pageSize: 50 });
    c.filtrar({ status: 'cerrado' });
    await pagina.fixture.whenStable();
    lista([]);
    await pagina.fixture.whenStable();
    expect(c.seleccionado()).toBeNull();
  });
  it('distingue vacío de sin coincidencias y permite limpiar filtros', async () => {
    await abrir();
    lista([]);
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('Todavía no hay tickets.');
    c.filtrar({ search: 'ninguno' });
    await pagina.fixture.whenStable();
    lista([]);
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('No hay tickets que coincidan');
    c.limpiar();
    await pagina.fixture.whenStable();
    lista([]);
    expect(TestBed.inject(Router).url).not.toContain('search=');
  });
  it('muestra error y reintenta', async () => {
    await abrir();
    http
      .expectOne((r) => r.url === '/api/tickets')
      .flush(
        { error: { code: 'INTERNAL_ERROR', message: 'No disponible' } },
        { status: 500, statusText: 'Error' },
      );
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('No disponible');
    Array.from(pagina.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    lista();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('TK-000123');
  });
  it('restaura URL, filtra por categoría/estado y pagina preservando filtros', async () => {
    await abrir('/tickets?search=impresora&status=creado&categoryId=8&page=2&pageSize=10');
    const r = http.expectOne((r) => r.url === '/api/tickets');
    expect(r.request.params.get('page')).toBe('2');
    expect(r.request.params.get('categoryId')).toBe('8');
    expect(r.request.params.get('status')).toBe('creado');
    r.flush({ data: [ticket], total: 31, page: 2, pageSize: 10 });
    c.pagina(3);
    await pagina.fixture.whenStable();
    lista([ticket], 31);
    expect(TestBed.inject(Router).url).toContain('page=3');
    c.filtrar({ status: 'resuelto' });
    await pagina.fixture.whenStable();
    const f = http.expectOne((r) => r.url === '/api/tickets');
    expect(f.request.params.get('page')).toBe('1');
    expect(f.request.params.get('status')).toBe('resuelto');
    f.flush({ data: [], total: 0, page: 1, pageSize: 10 });
  });
  it('espera 300 ms antes de buscar en backend y reinicia página', async () => {
    await abrir('/tickets?page=2');
    lista([ticket], 50);
    c.busqueda.setValue('nuevo');
    http.expectNone((r) => r.url === '/api/tickets');
    await new Promise((r) => setTimeout(r, 350));
    await pagina.fixture.whenStable();
    const r = http.expectOne((r) => r.url === '/api/tickets');
    expect(r.request.params.get('search')).toBe('nuevo');
    expect(r.request.params.get('page')).toBe('1');
    r.flush({ data: [], total: 0, page: 1, pageSize: 20 });
  });
  it('abre modal y tras creación avisa, recarga y navega al detalle', async () => {
    await abrir();
    lista();
    const boton = Array.from(pagina.routeNativeElement!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nuevo ticket'),
    )!;
    boton.click();
    await pagina.fixture.whenStable();
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [categoriaPrueba()] });
    expect(pagina.routeNativeElement!.querySelector('[role=dialog]')).not.toBeNull();
    c.creado(ticket);
    const reload = http.expectOne((r) => r.url === '/api/tickets');
    reload.flush({ data: [ticket], total: 1, page: 1, pageSize: 20 });
    await pagina.fixture.whenStable();
    http.expectOne('/api/tickets/123').flush(ticket);
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data: [], page: 1, pageSize: 50, total: 0 });
    await pagina.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/tickets/123');
    expect(TestBed.inject(Avisos).aviso()?.mensaje).toBe('Ticket TK-000123 creado correctamente.');
  });
  it('normaliza parámetros inválidos', () =>
    expect(
      leerFiltrosTickets(
        convertToParamMap({ page: '0', pageSize: '100', status: 'desconocido', categoryId: '0' }),
      ),
    ).toEqual({
      page: 1,
      pageSize: 20,
      search: undefined,
      status: undefined,
      priority: undefined,
      categoryId: undefined,
    }));
  it('detalle conserva saltos y representa descripción como texto, sin HTML', async () => {
    pagina = await RouterTestingHarness.create('/tickets/123');
    expect(pagina.routeNativeElement!.textContent).toContain('Cargando ticket');
    http.expectOne('/api/tickets/123').flush(ticket);
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data: [], page: 1, pageSize: 50, total: 0 });
    await pagina.fixture.whenStable();
    const e = pagina.routeNativeElement!;
    expect(e.textContent).toContain('TK-000123');
    expect(e.textContent).toContain('Sin asignar');

    expect(e.querySelector('.whitespace-pre-wrap')?.textContent).toBe(ticket.description);
    expect(e.querySelector('.whitespace-pre-wrap img')).toBeNull();
    expect(e.querySelector('textarea')).toBeNull();
  });
  it('detalle 404 no confirma datos ni ofrece cambios de estado', async () => {
    pagina = await RouterTestingHarness.create('/tickets/123');
    http
      .expectOne('/api/tickets/123')
      .flush(
        { error: { code: 'TICKET_NOT_FOUND', message: 'No se encontró el ticket.' } },
        { status: 404, statusText: 'Not Found' },
      );
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('No se encontró el ticket.');
    expect(pagina.routeNativeElement!.querySelector('app-insignia-estado')).toBeNull();
  });
  it('detalle permite reintentar errores de red', async () => {
    pagina = await RouterTestingHarness.create('/tickets/123');
    http.expectOne('/api/tickets/123').error(new ProgressEvent('error'));
    await pagina.fixture.whenStable();
    const d = pagina.fixture.debugElement.query(By.directive(DetalleTicket))
      .componentInstance as DetalleTicket;
    expect(d.error()).toContain('conectar');
    d.recargar.next();
    http.expectOne('/api/tickets/123').flush(ticket);
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data: [], page: 1, pageSize: 50, total: 0 });
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain(ticket.number);
  });

  it('restaura prioridad desde URL, aplica las cuatro opciones y conserva los demás filtros al paginar', async () => {
    await abrir(
      '/tickets?priority=alta&status=creado&categoryId=8&search=impresora&page=2&pageSize=10',
    );
    let r = http.expectOne((req) => req.url === '/api/tickets');
    expect(r.request.params.get('priority')).toBe('alta');
    r.flush({ data: [{ ...ticket, priority: 'alta' }], total: 31, page: 2, pageSize: 10 });
    pagina.detectChanges();
    expect(c.prioridad.value).toBe('alta');
    expect(
      pagina.routeNativeElement!.querySelector('app-insignia-prioridad')?.textContent,
    ).toContain('Alta');
    for (const priority of ['baja', 'media', 'alta', 'urgente']) {
      c.prioridad.setValue(priority);
      await pagina.fixture.whenStable();
      r = http.expectOne((req) => req.url === '/api/tickets');
      expect(r.request.params.get('priority')).toBe(priority);
      expect(r.request.params.get('page')).toBe('1');
      expect(r.request.params.get('status')).toBe('creado');
      r.flush({ data: [{ ...ticket, priority }], total: 31, page: 1, pageSize: 10 });
      expect(TestBed.inject(Router).url).toContain('priority=' + priority);
    }
    c.pagina(2);
    await pagina.fixture.whenStable();
    r = http.expectOne((req) => req.url === '/api/tickets');
    expect(r.request.params.get('priority')).toBe('urgente');
    expect(r.request.params.get('page')).toBe('2');
    r.flush({ data: [ticket], total: 31, page: 2, pageSize: 10 });
    c.prioridad.setValue('');
    await pagina.fixture.whenStable();
    r = http.expectOne((req) => req.url === '/api/tickets');
    expect(r.request.params.has('priority')).toBe(false);
    r.flush({ data: [], total: 0, page: 1, pageSize: 10 });
  });
  it('normaliza una prioridad desconocida de URL', () =>
    expect(
      leerFiltrosTickets(convertToParamMap({ priority: 'critica' })).priority,
    ).toBeUndefined());
});
describe('Nuevo ticket', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [notificacionesSinRed, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function crear() {
    const f = TestBed.createComponent(FormularioTicket);
    f.detectChanges();
    http.expectOne('/api/categories?includeInactive=false').flush({
      data: [categoriaPrueba(), categoriaPrueba({ id: '9', name: 'Antigua', isActive: false })],
    });
    f.detectChanges();
    return f;
  }
  it('solo ofrece categorías activas, valida obligatorios y máximos', () => {
    const f = crear();
    const c = f.componentInstance;
    expect(f.nativeElement.querySelector('option[value="9"]')).toBeNull();
    c.enviar();
    expect(c.campo('subject')).toContain('asunto');
    http.expectNone('/api/tickets');
    c.formulario.setValue({ subject: 'x'.repeat(161), description: 'Texto', categoryId: '8' });
    c.enviar();
    http.expectNone('/api/tickets');
    c.formulario.setValue({ subject: 'Asunto', description: 'x'.repeat(5001), categoryId: '8' });
    c.enviar();
    http.expectNone('/api/tickets');
  });
  it('envía datos recortados, impide doble envío y emite el ticket backend', () => {
    const f = crear();
    const c = f.componentInstance;
    let result: Ticket | undefined;
    c.creado.subscribe((t) => (result = t));
    c.formulario.setValue({ subject: '  Impresora  ', description: '  Texto  ', categoryId: '8' });
    c.enviar();
    c.enviar();
    expect(c.enviando()).toBe(true);
    const r = http.expectOne('/api/tickets');
    expect(r.request.body instanceof FormData).toBe(true);
    expect(Object.fromEntries((r.request.body as FormData).entries())).toEqual({
      subject: 'Impresora',
      description: 'Texto',
      categoryId: '8',
    });
    r.flush(ticket);
    expect(result).toEqual(ticket);
    expect(c.enviando()).toBe(false);
  });
  it('categoría desactivada recarga opciones, limpia selección y conserva texto', () => {
    const f = crear();
    const c = f.componentInstance;
    c.formulario.setValue({
      subject: 'Conservar asunto',
      description: 'Conservar descripción',
      categoryId: '8',
    });
    c.enviar();
    http
      .expectOne('/api/tickets')
      .flush(
        { error: { code: 'CATEGORY_INACTIVE', message: 'No disponible' } },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [] });
    expect(c.formulario.getRawValue()).toEqual({
      subject: 'Conservar asunto',
      description: 'Conservar descripción',
      categoryId: '',
    });
    expect(c.error()).toContain('Elige otra categoría');
  });
  it('error de red no borra el formulario y permite reintentar', () => {
    const f = crear();
    const c = f.componentInstance;
    const value = { subject: 'Asunto', description: 'Texto', categoryId: '8' };
    c.formulario.setValue(value);
    c.enviar();
    http.expectOne('/api/tickets').error(new ProgressEvent('error'));
    expect(c.formulario.getRawValue()).toEqual(value);
    expect(c.error()).toContain('conectar');
    c.enviar();
    http.expectOne('/api/tickets').flush(ticket);
  });
  it('un fallo al cargar categorías ofrece reintento y bloquea el envío', () => {
    const f = TestBed.createComponent(FormularioTicket);
    f.detectChanges();
    http.expectOne('/api/categories?includeInactive=false').error(new ProgressEvent('error'));
    f.componentInstance.enviar();
    http.expectNone('/api/tickets');
    f.componentInstance.cargarCategorias();
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [categoriaPrueba()] });
    expect(f.componentInstance.errorCategorias()).toBe('');
  });
});
