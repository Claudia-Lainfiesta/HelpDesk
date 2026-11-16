import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TicketsApi } from './tickets-api';
describe('TicketsApi', () => {
  let http: HttpTestingController;
  let api: TicketsApi;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(TicketsApi);
  });
  afterEach(() => http.verify());
  it('envía paginación, búsqueda y filtros al servidor', () => {
    api
      .listar({
        page: 2,
        pageSize: 10,
        search: 'TK-000123',
        status: 'en_espera',
        categoryId: '4',
        priority: 'alta',
      })
      .subscribe();
    const r = http.expectOne((r) => r.url === '/api/tickets');
    expect(
      Object.fromEntries(r.request.params.keys().map((k) => [k, r.request.params.get(k)])),
    ).toEqual({
      page: '2',
      pageSize: '10',
      search: 'TK-000123',
      status: 'en_espera',
      priority: 'alta',
      categoryId: '4',
    });
    r.flush({ data: [], page: 2, pageSize: 10, total: 0 });
  });
  it('omite filtros vacíos y obtiene el detalle', () => {
    api.listar({ page: 1, pageSize: 20, search: '', status: undefined }).subscribe();
    const r = http.expectOne('/api/tickets?page=1&pageSize=20');
    r.flush({ data: [], total: 0, page: 1, pageSize: 20 });
    api.obtener('123').subscribe();
    http.expectOne('/api/tickets/123').flush({});
  });
  it('crea solo con los tres campos del formulario', () => {
    const body = { subject: 'Impresora', description: 'Texto', categoryId: '4' };
    api.crear(body).subscribe();
    const r = http.expectOne('/api/tickets');
    expect(r.request.method).toBe('POST');
    expect(r.request.body instanceof FormData).toBe(true);
    expect(Object.fromEntries((r.request.body as FormData).entries())).toEqual(body);
    r.flush({});
  });

  it('consulta agentes y actividad paginada; mutaciones envían solo IDs y acciones JSON', () => {
    api.agentesAsignables().subscribe();
    http.expectOne('/api/tickets/assignable-agents').flush([]);
    api.eventos('123', 2, 50).subscribe();
    http
      .expectOne('/api/tickets/123/events?page=2&pageSize=50')
      .flush({ data: [], page: 2, pageSize: 50, total: 0 });
    for (const id of ['42', null]) {
      api.asignar('123', id).subscribe();
      const r = http.expectOne('/api/tickets/123/assignment');
      expect(r.request.method).toBe('PATCH');
      expect(r.request.body).toEqual({ agentId: id });
      r.flush({});
    }
    api.transicion('123', 'resolve').subscribe();
    const r = http.expectOne('/api/tickets/123/transitions');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ action: 'resolve' });
    r.flush({});
  });

  it('cambia prioridad enviando exclusivamente el nuevo valor', () => {
    api.cambiarPrioridad('123', 'urgente').subscribe();
    const r = http.expectOne('/api/tickets/123/priority');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ priority: 'urgente' });
    r.flush({});
  });
  it('publica solo el texto de nota y consulta contacto sin aceptar destinos del cliente', () => {
    api.agregarNota('123', 'Seguimiento').subscribe();
    const r = http.expectOne('/api/tickets/123/notes');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ body: 'Seguimiento' });
    r.flush({});
    api.contactoTelegram('123').subscribe();
    const contacto = http.expectOne('/api/tickets/123/telegram-contact');
    expect(contacto.request.method).toBe('GET');
    expect(contacto.request.params.keys()).toEqual([]);
    contacto.flush({
      available: false,
      message: 'El agente asignado no tiene Telegram disponible.',
    });
  });
  it('crea con imagen en FormData sin agregar metadata autoritativa ni Content-Type', () => {
    const image = new File(['fixture'], 'foto.png', { type: 'image/png' });
    api
      .crear({ subject: 'Asunto', description: 'Descripción', categoryId: '4' }, image)
      .subscribe();
    const r = http.expectOne('/api/tickets');
    const body = r.request.body as FormData;
    expect([...body.keys()]).toEqual(['subject', 'description', 'categoryId', 'image']);
    expect(body.get('image')).toBe(image);
    expect(r.request.headers.has('Content-Type')).toBe(false);
    r.flush({});
    api.imagen('123').subscribe();
    const read = http.expectOne('/api/tickets/123/attachment');
    expect(read.request.responseType).toBe('blob');
    read.flush(new Blob(['fixture'], { type: 'image/png' }));
  });
});
