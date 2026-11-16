import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VistaPreviaTicket } from './vista-previa-ticket';
import { AuthService } from '../../core/auth/auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';
import { Ticket } from '../../core/tickets/tickets-api';
import { Rol } from '../../core/auth/modelos';

const agente = { id: '7', fullName: 'Juan Pérez', email: 'juan@example.invalid' };
const ticket: Ticket = {
  id: '123',
  number: 'TK-000123',
  subject: 'Impresora',
  description: 'Texto <script>sin ejecutar</script>',
  status: 'creado',
  priority: 'media',
  category: { id: '1', name: 'Hardware' },
  requester: { id: '1', fullName: 'Ana', email: 'ana@example.invalid' },
  assignedAgent: agente,
  createdAt: '2026-11-06T19:00:00Z',
  updatedAt: '2026-11-06T19:00:00Z',
  resolvedAt: null,
  closedAt: null,
  canceledAt: null,
  attachment: null,
};

describe('Vista previa y gestión compartida del ticket', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function abrir(role: Rol = 'administrador', id = '9', t = ticket) {
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({ ...usuarioPrueba, role, id });
    const f = TestBed.createComponent(VistaPreviaTicket);
    f.componentRef.setInput('ticketId', '123');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Cargando ticket');
    http.expectOne('/api/tickets/123').flush(t);
    actividad();
    if (role === 'administrador' || role === 'supervisor')
      http
        .expectOne('/api/tickets/assignable-agents')
        .flush([agente, { ...agente, id: '8', fullName: 'Pedro' }]);
    for (const r of http.match('/api/tickets/123/telegram-contact'))
      r.flush({ available: false, message: 'Este agente no tiene Telegram configurado.' });
    f.detectChanges();
    return f;
  }
  function actividad() {
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data: [], total: 0, page: 1, pageSize: 50 });
  }
  function pulsar(e: HTMLElement, texto: string) {
    Array.from(e.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === texto)!
      .click();
  }
  it.each([
    ['administrador', '9', true],
    ['supervisor', '9', true],
    ['agente', '7', true],
    ['agente', '1', false],
    ['solicitante', '1', false],
  ] as [Rol, string, boolean][])(
    '%s %s conserva los permisos de prioridad y estado',
    (role, id, puede) => {
      const f = abrir(role, id);
      expect(!!f.nativeElement.querySelector('#previa-prioridad')).toBe(puede);
      expect(
        !!f.nativeElement
          .querySelector('[aria-label="Cambiar estado"]')
          ?.textContent.includes('Iniciar atención'),
      ).toBe(puede);
      expect(f.nativeElement.querySelector('a').getAttribute('href')).toBe('/tickets/123');
      expect(f.nativeElement.textContent).toContain(ticket.description);
      expect(f.nativeElement.querySelector('script')).toBeNull();
    },
  );
  it('prioridad aplica la misma petición, bloquea envíos y comunica el ticket actualizado', () => {
    const f = abrir();
    const actualizar = vi.fn(),
      ocupacion = vi.fn();
    f.componentInstance.actualizado.subscribe(actualizar);
    f.componentInstance.gestionando.subscribe(ocupacion);
    const selector = f.nativeElement.querySelector('#previa-prioridad') as HTMLSelectElement;
    selector.value = 'alta';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    f.detectChanges();
    pulsar(f.nativeElement, 'Cambiar prioridad');
    f.detectChanges();
    expect(ocupacion).toHaveBeenCalledWith(true);
    expect(selector.disabled).toBe(true);
    f.componentInstance.guardarPrioridad();
    const peticion = http.expectOne('/api/tickets/123/priority');
    expect(peticion.request.body).toEqual({ priority: 'alta' });
    peticion.flush({ ...ticket, priority: 'alta' });
    actividad();
    f.detectChanges();
    expect(actualizar).toHaveBeenCalledWith({ ...ticket, priority: 'alta' });
    expect(ocupacion).toHaveBeenLastCalledWith(false);
    expect(f.nativeElement.querySelector('app-insignia-prioridad').textContent).toContain('Alta');
  });
  it('reasignar y cancelar mantienen confirmación antes de enviar', () => {
    const f = abrir();
    const selector = f.nativeElement.querySelector('#previa-agente') as HTMLSelectElement;
    selector.value = '8';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    f.detectChanges();
    pulsar(f.nativeElement, 'Guardar asignación');
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=dialog]').textContent).toContain('¿Reasignar');
    http.expectNone('/api/tickets/123/assignment');
    pulsar(f.nativeElement, 'Cancelar');
    f.detectChanges();
    pulsar(f.nativeElement, 'Cancelar ticket');
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=dialog]').textContent).toContain('¿Confirmas');
    http.expectNone('/api/tickets/123/transitions');
  });
  it('conserva la actividad, sus errores y los estados terminales de solo lectura', () => {
    const f = abrir('supervisor', '9', { ...ticket, status: 'cerrado' });
    expect(f.nativeElement.querySelector('[aria-label="Acciones rápidas"]')).toBeNull();
    pulsar(f.nativeElement, 'Actividad');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No hay actividad registrada.');
    f.componentInstance.cargarActividad();
    http.expectOne('/api/tickets/123/events?page=1&pageSize=50').error(new ProgressEvent('error'));
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    pulsar(f.nativeElement, 'Reintentar actividad');
    actividad();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
  });
});
