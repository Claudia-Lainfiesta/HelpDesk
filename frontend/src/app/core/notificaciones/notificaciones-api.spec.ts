import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NotificationsApi } from './notificaciones-api';
describe('NotificationsApi', () => {
  let http: HttpTestingController, api: NotificationsApi;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(NotificationsApi);
  });
  afterEach(() => http.verify());
  it('consulta contador y página de la sesión, sin userId', () => {
    api.contador().subscribe();
    const count = http.expectOne('/api/notifications/unread-count');
    expect(count.request.method).toBe('GET');
    count.flush({ count: 4 });
    api.listar(2, 10, true).subscribe();
    const list = http.expectOne('/api/notifications?page=2&pageSize=10&unreadOnly=true');
    expect(list.request.method).toBe('GET');
    expect(list.request.params.has('userId')).toBe(false);
    list.flush({ items: [], pagination: { page: 2, pageSize: 10, total: 0 } });
  });
  it('las mutaciones envían JSON vacío y el ID forma parte de la ruta', () => {
    api.leer('42').subscribe();
    const read = http.expectOne('/api/notifications/42/read');
    expect(read.request.method).toBe('PATCH');
    expect(read.request.body).toEqual({});
    read.flush(null, { status: 204, statusText: 'No Content' });
    api.leerTodas().subscribe();
    const all = http.expectOne('/api/notifications/read-all');
    expect(all.request.method).toBe('POST');
    expect(all.request.body).toEqual({});
    all.flush(null, { status: 204, statusText: 'No Content' });
  });
});
