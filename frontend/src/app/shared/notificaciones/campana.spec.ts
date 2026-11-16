import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Usuario } from '../../core/auth/modelos';
import { usuarioPrueba } from '../../pruebas/usuario';
import { Campana } from './campana';
import { Notificacion } from '../../core/notificaciones/notificaciones-api';
const item: Notificacion = {
  id: '40',
  type: 'ticket_started',
  title: 'Tu ticket está siendo atendido',
  message: 'Tu ticket TK-000020 ahora está en proceso.',
  ticketId: '20',
  ticketNumber: 'TK-000020',
  createdAt: '2026-11-15T20:15:00.000Z',
  readAt: null,
};
describe('Campana y estado de notificaciones', () => {
  let http: HttpTestingController, f: ComponentFixture<Campana>;
  const usuario = signal<Usuario | null>(usuarioPrueba),
    events = new Subject<NavigationEnd>();
  const navigate = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    usuario.set(usuarioPrueba);
    navigate.mockClear();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuario } },
        { provide: Router, useValue: { events, navigate } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    f = TestBed.createComponent(Campana);
    f.detectChanges();
  });
  afterEach(() => {
    f.destroy();
    http.verify();
    vi.useRealTimers();
  });
  function count(n = 1) {
    http.expectOne('/api/notifications/unread-count').flush({ count: n });
    f.detectChanges();
  }
  function open(items = [item], total = items.length) {
    (f.nativeElement.querySelector('button') as HTMLButtonElement).click();
    f.detectChanges();
    http
      .expectOne('/api/notifications?page=1&pageSize=20&unreadOnly=false')
      .flush({ items, pagination: { page: 1, pageSize: 20, total } });
    f.detectChanges();
  }
  it.each([
    [0, null],
    [1, '1'],
    [25, '25'],
    [100, '99+'],
  ] as const)('badge %s y nombre accesible', (n, badge) => {
    count(n);
    const button = f.nativeElement.querySelector('button');
    expect(button.querySelector('span')?.textContent?.trim() ?? null).toBe(badge);
    expect(button.getAttribute('aria-label')).toBe(
      n ? `Notificaciones, ${n} sin leer` : 'Notificaciones',
    );
  });
  it('abre/carga panel; muestra vacío, error único y permite reintentar', () => {
    count(0);
    f.componentInstance.alternar();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Cargando notificaciones');
    http.expectOne((r) => r.url === '/api/notifications').error(new ProgressEvent('error'));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No fue posible cargar');
    const retry = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Reintentar'),
    )!;
    retry.click();
    http
      .expectOne((r) => r.url === '/api/notifications')
      .flush({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No tienes notificaciones.');
  });
  it('muestra leídas y sin leer con texto, fechas y cuerpo escapado', () => {
    count(1);
    open([
      { ...item, message: '<script>alert(1)</script>' },
      { ...item, id: '41', readAt: '2026-11-15T20:16:00.000Z' },
    ]);
    expect(f.nativeElement.textContent).toContain('Sin leer');
    expect(f.nativeElement.querySelectorAll('time')).toHaveLength(2);
    expect(f.nativeElement.querySelector('script')).toBeNull();
    expect(f.nativeElement.textContent).toContain('<script>alert(1)</script>');
  });
  it('muestra ticket_started, marca antes de navegar al ticket y refresca el contador', () => {
    count();
    open();
    expect(f.nativeElement.textContent).toContain('Tu ticket está siendo atendido');
    expect(f.nativeElement.textContent).toContain('Tu ticket TK-000020 ahora está en proceso.');
    const button = (f.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Notificaciones, 1 sin leer');
    f.componentInstance.seleccionar(item);
    expect(navigate).not.toHaveBeenCalled();
    const read = http.expectOne('/api/notifications/40/read');
    read.flush(null, { status: 204, statusText: 'No Content' });
    count(0);
    expect(navigate).toHaveBeenCalledWith(['/tickets', '20']);
    expect(f.componentInstance.estado.items()[0]!.readAt).not.toBeNull();
    expect(f.componentInstance.abierto()).toBe(false);
  });
  it('sin destino solo lee; evita doble envío y no navega', () => {
    count();
    open([{ ...item, ticketId: null }]);
    const row = { ...item, ticketId: null };
    f.componentInstance.seleccionar(row);
    f.componentInstance.seleccionar(row);
    http
      .expectOne('/api/notifications/40/read')
      .flush(null, { status: 204, statusText: 'No Content' });
    count(0);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('marca todas, conserva la lista leída y deshabilita con cero', () => {
    count(2);
    open([item, { ...item, id: '41' }]);
    f.componentInstance.estado.leerTodas();
    http
      .expectOne('/api/notifications/read-all')
      .flush(null, { status: 204, statusText: 'No Content' });
    count(0);
    expect(f.componentInstance.estado.items().every((i) => i.readAt !== null)).toBe(true);
    const button = Array.from(f.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Marcar todas'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
  it('un fallo al leer conserva el elemento y permite recuperarse', () => {
    count();
    open();
    f.componentInstance.seleccionar(item);
    http.expectOne('/api/notifications/40/read').error(new ProgressEvent('error'));
    f.detectChanges();
    expect(f.componentInstance.estado.items()[0]!.readAt).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('No fue posible marcar');
  });
  it('pagina sin mezclar usuarios y devuelve foco con Escape', () => {
    count();
    open([item], 21);
    expect(document.activeElement).toBe(f.nativeElement.querySelector('section'));
    f.componentInstance.estado.cargar(2);
    http
      .expectOne('/api/notifications?page=2&pageSize=20&unreadOnly=false')
      .flush({ items: [], pagination: { page: 2, pageSize: 20, total: 21 } });
    f.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('section')).toBeNull();
    expect(document.activeElement).toBe(f.nativeElement.querySelector('button'));
  });
  it('polling solo contador cada 30 s y al navegar; se pausa oculta y refresca al volver', () => {
    count(1);
    vi.advanceTimersByTime(29999);
    http.expectNone('/api/notifications/unread-count');
    vi.advanceTimersByTime(1);
    count(2);
    events.next(new NavigationEnd(1, '/tickets', '/tickets'));
    count(3);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.advanceTimersByTime(60000);
    http.expectNone('/api/notifications/unread-count');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    count(4);
    http.expectNone((r) => r.url === '/api/notifications');
  });
  it('detiene timers y borra datos al cerrar sesión; nuevo ingreso arranca un único polling', () => {
    count(3);
    open();
    usuario.set(null);
    f.detectChanges();
    expect(f.componentInstance.estado.items()).toEqual([]);
    expect(f.componentInstance.estado.unreadCount()).toBe(0);
    vi.advanceTimersByTime(90000);
    http.expectNone('/api/notifications/unread-count');
    usuario.set({ ...usuarioPrueba, id: '2' });
    f.detectChanges();
    count(1);
    vi.advanceTimersByTime(30000);
    count(2);
  });
  it('destruir la campana cancela intervalos y peticiones pendientes', () => {
    count();
    vi.advanceTimersByTime(30000);
    const req = http.expectOne('/api/notifications/unread-count');
    f.destroy();
    expect(req.cancelled).toBe(true);
    vi.advanceTimersByTime(90000);
    http.expectNone('/api/notifications/unread-count');
  });
});
