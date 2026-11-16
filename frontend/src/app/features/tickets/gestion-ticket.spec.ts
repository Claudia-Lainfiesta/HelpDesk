import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DetalleTicket } from './detalle-ticket';
import { AuthService } from '../../core/auth/auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';
import { Ticket, EventoTicket } from '../../core/tickets/tickets-api';
import { permisosTicket } from '../../core/tickets/permisos-ticket';
import { Avisos } from '../../shared/ui/aviso-flotante';
import { Usuario } from '../../core/auth/modelos';
const agente = { id: '7', fullName: 'Juan', email: 'juan@example.invalid' };
const ticket: Ticket = {
  id: '123',
  number: 'TK-000123',
  subject: 'Equipo',
  description: 'Solicitud',
  status: 'creado',
  priority: 'media',
  category: { id: '1', name: 'Hardware' },
  requester: { id: '1', fullName: 'Ana', email: 'ana@example.invalid' },
  assignedAgent: null,
  createdAt: '2026-11-06T19:00:00Z',
  updatedAt: '2026-11-06T19:00:00Z',
  resolvedAt: null,
  closedAt: null,
  canceledAt: null,
};
const evento: EventoTicket = {
  id: '1',
  type: 'created',
  actor: { id: '1', fullName: 'Ana', role: 'solicitante' },
  fromAgent: null,
  toAgent: null,
  fromPriority: null,
  toPriority: null,
  fromStatus: null,
  toStatus: null,
  createdAt: ticket.createdAt,
};
describe('derechos combinados de tickets', () => {
  const soporte = ['start', 'wait,resolve', 'resume,resolve', '', '', ''];
  const propietario = ['cancel', '', 'cancel', 'reopen,close', '', ''];
  const estados = [
    'creado',
    'en_proceso',
    'en_espera',
    'resuelto',
    'cerrado',
    'cancelado',
  ] as const;
  const actores: [string, Usuario, boolean, boolean][] = [
    ['propietario solicitante', usuarioPrueba, true, false],
    ['agente asignado ajeno', { ...usuarioPrueba, id: '7', role: 'agente' }, false, true],
    ['otro agente', { ...usuarioPrueba, id: '8', role: 'agente' }, false, false],
    ['agente propietario no asignado', { ...usuarioPrueba, role: 'agente' }, true, false],
    ['administrador', { ...usuarioPrueba, id: '9', role: 'administrador' }, false, true],
    ['supervisor', { ...usuarioPrueba, id: '10', role: 'supervisor' }, false, true],
  ];
  for (const [nombre, u, owner, support] of actores)
    estados.forEach((status, i) =>
      it(`${nombre} en ${status}`, () => {
        const actual = permisosTicket({ ...ticket, status, assignedAgent: agente }, u);
        const admin = ['supervisor', 'administrador'].includes(u.role);
        const expected = [
          ...(support && soporte[i] ? soporte[i].split(',') : []),
          ...((owner || admin) && propietario[i] ? propietario[i].split(',') : []),
        ];
        expect(actual.acciones).toEqual(expected);
        expect(actual.prioridadEditable).toBe(
          support && !['cerrado', 'cancelado'].includes(status),
        );
        if (['resuelto', 'cerrado', 'cancelado'].includes(status))
          expect(actual.asignacion).toBe('ninguna');
      }),
    );
  it('un agente libre puede asignarse; supervisor gestiona; sin agente no hay atención', () => {
    expect(permisosTicket(ticket, { ...usuarioPrueba, id: '7', role: 'agente' }).asignacion).toBe(
      'propia',
    );
    const p = permisosTicket(ticket, { ...usuarioPrueba, role: 'supervisor' });
    expect(p.asignacion).toBe('gestionar');
    expect(p.acciones).toEqual(['cancel']);
    expect(permisosTicket(ticket, null).acciones).toEqual([]);
  });
});
describe('operaciones del detalle', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '123' })) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function abrir(u: Usuario = { ...usuarioPrueba, id: '7', role: 'agente' }, t: Ticket = ticket) {
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(u);
    const f = TestBed.createComponent(DetalleTicket);
    f.detectChanges();
    http.expectOne('/api/tickets/123').flush(t);
    actividad();
    if (['supervisor', 'administrador'].includes(u.role))
      http
        .expectOne('/api/tickets/assignable-agents')
        .flush([agente, { ...agente, id: '8', fullName: 'Pedro' }]);
    f.detectChanges();
    return f;
  }
  function actividad(data: EventoTicket[] = [evento]) {
    http
      .expectOne('/api/tickets/123/events?page=1&pageSize=50')
      .flush({ data, page: 1, pageSize: 50, total: data.length });
  }
  it('agente se asigna sin confirmación, mantiene Creado y actualiza actividad', () => {
    const f = abrir();
    expect(f.nativeElement.textContent).toContain('Asignarme');
    f.componentInstance.asignarme();
    f.componentInstance.asignarme();
    const r = http.expectOne('/api/tickets/123/assignment');
    expect(r.request.body).toEqual({ agentId: '7' });
    r.flush({ ...ticket, assignedAgent: agente });
    actividad();
    f.detectChanges();
    expect(f.componentInstance.ticket()?.status).toBe('creado');
    expect(f.nativeElement.textContent).toContain('Iniciar atención');
    expect(f.nativeElement.textContent).not.toContain('Guardar asignación');
  });
  it('agente ajeno no ve controles; propietario conserva cancelar y no resolver', () => {
    const f = abrir(
      { ...usuarioPrueba, role: 'agente' },
      { ...ticket, status: 'en_espera', assignedAgent: agente },
    );
    expect(f.nativeElement.textContent).toContain('Cancelar ticket');
    expect(f.nativeElement.textContent).not.toContain('Marcar como resuelto');
    expect(f.nativeElement.textContent).not.toContain('Asignarme');
  });
  it.each(['supervisor', 'administrador'] as const)(
    '%s confirma reasignación y desasignación',
    (role) => {
      const f = abrir({ ...usuarioPrueba, id: '9', role }, { ...ticket, assignedAgent: agente });
      const c = f.componentInstance;
      expect(f.nativeElement.querySelector('select')).not.toBeNull();
      c.agente.setValue('8');
      c.guardarAsignacion();
      f.detectChanges();
      expect(f.nativeElement.querySelector('[role=dialog]')?.textContent).toContain(
        'de Juan a Pedro',
      );
      http.expectNone('/api/tickets/123/assignment');
      c.confirmar();
      http
        .expectOne('/api/tickets/123/assignment')
        .flush({ ...ticket, assignedAgent: { ...agente, id: '8', fullName: 'Pedro' } });
      actividad();
      c.agente.setValue('');
      c.guardarAsignacion();
      expect(c.pendiente()?.mensaje).toContain('sin agente');
      c.confirmar();
      http.expectOne('/api/tickets/123/assignment').flush(ticket);
      actividad();
      expect(c.ticket()?.assignedAgent).toBeNull();
    },
  );
  it.each(['resolve', 'reopen', 'close', 'cancel'] as const)(
    'pide confirmación para %s y envía solo la acción',
    (action) => {
      const t = {
        ...ticket,
        status:
          action === 'resolve'
            ? ('en_proceso' as const)
            : action === 'cancel'
              ? ('creado' as const)
              : ('resuelto' as const),
        assignedAgent: agente,
      };
      const u =
        action === 'resolve'
          ? { ...usuarioPrueba, id: '7', role: 'agente' as const }
          : usuarioPrueba;
      const f = abrir(u, t);
      const c = f.componentInstance;
      c.actuar(action);
      f.detectChanges();
      expect(f.nativeElement.querySelector('[role=dialog]')).not.toBeNull();
      http.expectNone('/api/tickets/123/transitions');
      c.confirmar();
      const r = http.expectOne('/api/tickets/123/transitions');
      expect(r.request.body).toEqual({ action });
      r.flush({
        ...t,
        status:
          action === 'resolve'
            ? 'resuelto'
            : action === 'reopen'
              ? 'en_proceso'
              : action === 'close'
                ? 'cerrado'
                : 'cancelado',
      });
      actividad();
      expect(c.pendiente()).toBeNull();
    },
  );
  it.each(['start', 'wait', 'resume'] as const)('ejecuta %s sin confirmación', (action) => {
    const t = {
      ...ticket,
      status:
        action === 'start'
          ? ('creado' as const)
          : action === 'wait'
            ? ('en_proceso' as const)
            : ('en_espera' as const),
      assignedAgent: agente,
    };
    const f = abrir(undefined, t);
    f.componentInstance.actuar(action);
    expect(f.componentInstance.pendiente()).toBeNull();
    http.expectOne('/api/tickets/123/transitions').flush(t);
    actividad();
  });
  it('un conflicto muestra el mensaje y recarga detalle y actividad', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.asignarme();
    http.expectOne('/api/tickets/123/assignment').flush(
      {
        error: {
          code: 'TICKET_ALREADY_ASSIGNED',
          message: 'Este ticket ya fue asignado a otro agente.',
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    http.expectOne('/api/tickets/123').flush({ ...ticket, assignedAgent: { ...agente, id: '8' } });
    actividad();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Este ticket ya fue asignado');
    expect(f.nativeElement.textContent).not.toContain('Asignarme');
  });
  it('terminal no ofrece acciones; actividad maneja error, reintento y paginación', () => {
    const f = abrir(usuarioPrueba, { ...ticket, status: 'cerrado', assignedAgent: agente });
    const c = f.componentInstance;
    expect(c.permisos().acciones).toEqual([]);
    expect(c.permisos().asignacion).toBe('ninguna');
    c.cargarActividad(2);
    http.expectOne('/api/tickets/123/events?page=2&pageSize=50').error(new ProgressEvent('error'));
    expect(c.errorActividad()).toContain('conectar');
    c.cargarActividad(2);
    http
      .expectOne('/api/tickets/123/events?page=2&pageSize=50')
      .flush({ data: [evento], page: 2, pageSize: 50, total: 51 });
    expect(c.actividad()).toEqual([evento]);
  });
  it('representa todos los tipos sin HTML y conserva los nombres y fechas', () => {
    const f = abrir();
    const c = f.componentInstance;
    expect(c.textoEvento(evento)).toBe('Ana creó el ticket.');
    expect(
      c.textoEvento({ ...evento, type: 'assigned', toAgent: { id: '1', fullName: 'Ana' } }),
    ).toContain('se asignó');
    expect(c.textoEvento({ ...evento, type: 'assigned', toAgent: agente })).toContain(
      'asignó el ticket a Juan',
    );
    expect(
      c.textoEvento({
        ...evento,
        type: 'reassigned',
        fromAgent: agente,
        toAgent: { id: '8', fullName: 'Pedro' },
      }),
    ).toContain('de Juan a Pedro');
    expect(c.textoEvento({ ...evento, type: 'unassigned', fromAgent: agente })).toContain(
      'sin asignar',
    );
    for (const [fromStatus, toStatus, text] of [
      ['resuelto', 'en_proceso', 'reabrió'],
      ['en_proceso', 'resuelto', 'resuelto'],
      ['resuelto', 'cerrado', 'cerró'],
      ['creado', 'cancelado', 'canceló'],
      ['creado', 'en_proceso', 'Creado a En proceso'],
    ] as const)
      expect(c.textoEvento({ ...evento, type: 'status_changed', fromStatus, toStatus })).toContain(
        text,
      );
    c.actividad.set([{ ...evento, actor: { ...evento.actor, fullName: '<img src=x>' } }]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('<img src=x>');
    expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.nativeElement.querySelector('time').getAttribute('datetime')).toBe(evento.createdAt);
  });

  it('una respuesta antigua no reemplaza actividad obtenida después', () => {
    const f = abrir();
    const c = f.componentInstance;
    c.cargarActividad();
    c.cargarActividad();
    const requests = http.match('/api/tickets/123/events?page=1&pageSize=50');
    const reciente = {
      ...evento,
      id: '2',
      type: 'assigned' as const,
      toAgent: { id: '7', fullName: 'Juan' },
    };
    requests[1].flush({ data: [reciente], page: 1, pageSize: 50, total: 2 });
    requests[0].flush({ data: [evento], page: 1, pageSize: 50, total: 1 });
    expect(c.actividad()).toEqual([reciente]);
    expect(c.totalEventos()).toBe(2);
  });

  it.each(['agente', 'supervisor', 'administrador'] as const)(
    '%s cambia prioridad sin confirmación, impide doble envío y actualiza valor/actividad/aviso',
    (role) => {
      const u = { ...usuarioPrueba, id: role === 'agente' ? '7' : '9', role };
      const f = abrir(u, { ...ticket, status: 'resuelto', assignedAgent: agente });
      const c = f.componentInstance;
      expect(f.nativeElement.querySelector('#prioridad-ticket-selector')).not.toBeNull();
      c.prioridad.setValue('alta');
      c.guardarPrioridad();
      c.guardarPrioridad();
      f.detectChanges();
      expect(c.ocupada()).toBe(true);
      expect(c.prioridad.disabled).toBe(true);
      expect(f.nativeElement.querySelector('[role=dialog]')).toBeNull();
      const r = http.expectOne('/api/tickets/123/priority');
      expect(r.request.method).toBe('PATCH');
      expect(r.request.body).toEqual({ priority: 'alta' });
      r.flush({ ...ticket, status: 'resuelto', assignedAgent: agente, priority: 'alta' });
      actividad([
        {
          ...evento,
          type: 'priority_changed',
          fromPriority: 'media',
          toPriority: 'alta',
          actor: { id: u.id, fullName: u.fullName, role },
        },
      ]);
      f.detectChanges();
      expect(c.ticket()?.priority).toBe('alta');
      expect(c.ticket()?.status).toBe('resuelto');
      expect(c.ocupada()).toBe(false);
      expect(c.prioridad.enabled).toBe(true);
      expect(TestBed.inject(Avisos).aviso()?.mensaje).toBe('Prioridad actualizada a Alta.');
      expect(f.nativeElement.textContent).toContain('cambió la prioridad de Media a Alta.');
    },
  );
  it.each([
    ['solicitante propietario', usuarioPrueba, 'creado'],
    ['agente propietario no asignado', { ...usuarioPrueba, role: 'agente' }, 'creado'],
    ['otro agente', { ...usuarioPrueba, id: '8', role: 'agente' }, 'en_proceso'],
    ['agente asignado cerrado', { ...usuarioPrueba, id: '7', role: 'agente' }, 'cerrado'],
    ['administrador cancelado', { ...usuarioPrueba, id: '9', role: 'administrador' }, 'cancelado'],
  ] as const)('%s ve insignia pero carece de edición', (_label, u, status) => {
    const f = abrir(u, { ...ticket, status, assignedAgent: agente, priority: 'urgente' });
    const c = f.componentInstance;
    expect(f.nativeElement.querySelector('app-insignia-prioridad')?.textContent).toContain(
      'Urgente',
    );
    expect(f.nativeElement.querySelector('#prioridad-ticket-selector')).toBeNull();
    c.prioridad.setValue('baja');
    c.guardarPrioridad();
    http.expectNone('/api/tickets/123/priority');
  });
  it('agente propietario y asignado conserva el permiso de soporte; repetición o valor inválido no envían', () => {
    const f = abrir(
      { ...usuarioPrueba, id: '7', role: 'agente' },
      { ...ticket, assignedAgent: agente, requester: { ...ticket.requester, id: '7' } },
    );
    const c = f.componentInstance;
    expect(c.permisos().prioridadEditable).toBe(true);
    c.guardarPrioridad();
    c.prioridad.setValue('critica');
    c.guardarPrioridad();
    http.expectNone('/api/tickets/123/priority');
  });
  it('un error conserva la prioridad actual, muestra el mensaje y permite reintentar', () => {
    const f = abrir(undefined, { ...ticket, assignedAgent: agente });
    const c = f.componentInstance;
    c.prioridad.setValue('alta');
    c.guardarPrioridad();
    http
      .expectOne('/api/tickets/123/priority')
      .flush(
        { error: { code: 'UNAVAILABLE', message: 'No disponible ahora.' } },
        { status: 503, statusText: 'Unavailable' },
      );
    f.detectChanges();
    expect(c.ticket()?.priority).toBe('media');
    expect(c.errorAccion()).toBe('No disponible ahora.');
    expect(c.ocupada()).toBe(false);
    expect(c.prioridad.value).toBe('alta');
    c.guardarPrioridad();
    http
      .expectOne('/api/tickets/123/priority')
      .flush({ ...ticket, assignedAgent: agente, priority: 'alta' });
    actividad();
  });
  it('conflicto de prioridad recarga detalle y actividad, y retira edición si se cerró', () => {
    const f = abrir(undefined, { ...ticket, assignedAgent: agente });
    const c = f.componentInstance;
    c.prioridad.setValue('alta');
    c.guardarPrioridad();
    http
      .expectOne('/api/tickets/123/priority')
      .flush(
        { error: { code: 'TICKET_PRIORITY_NOT_EDITABLE', message: 'El ticket ya está cerrado.' } },
        { status: 409, statusText: 'Conflict' },
      );
    http
      .expectOne('/api/tickets/123')
      .flush({ ...ticket, assignedAgent: agente, status: 'cerrado', priority: 'urgente' });
    actividad();
    f.detectChanges();
    expect(c.ticket()?.priority).toBe('urgente');
    expect(f.nativeElement.querySelector('#prioridad-ticket-selector')).toBeNull();
    expect(f.nativeElement.textContent).toContain('El ticket ya está cerrado.');
  });
});
