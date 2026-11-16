import {
  Directive,
  DestroyRef,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  startWith,
  switchMap,
} from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { TicketsApi, Ticket, EventoTicket, PersonaTicket } from '../../core/tickets/tickets-api';
import { interpretarError } from '../../core/auth/fallo-api';
import {
  esPrioridad,
  opcionesPrioridad,
  etiquetasPrioridad,
  TicketPriority,
} from '../../core/tickets/prioridad';
import { AuthService } from '../../core/auth/auth.service';
import { AccionTicket, accionesTicket, permisosTicket } from '../../core/tickets/permisos-ticket';
import { estados } from '../../shared/ui/insignia-estado';
import { Avisos } from '../../shared/ui/aviso-flotante';

@Directive()
export abstract class GestionTicket implements OnChanges {
  readonly ticketId = input<string>();
  readonly actualizado = output<Ticket>();
  readonly gestionando = output<boolean>();
  private readonly identificador = new Subject<string>();
  ngOnChanges(cambios: SimpleChanges) {
    if (cambios['ticketId'] && this.ticketId()) this.identificador.next(this.ticketId()!);
  }
  private readonly api = inject(TicketsApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(Avisos);
  readonly catalogoAcciones = accionesTicket;
  readonly permisos = computed(() =>
    this.ticket()
      ? permisosTicket(this.ticket()!, this.auth.usuario())
      : {
          asignacion: 'ninguna',
          acciones: [] as AccionTicket[],
          prioridadEditable: false,
          notasVisibles: false,
          seguimientoEditable: false,
          telegramVisible: false,
        },
  );
  readonly agentes = signal<PersonaTicket[]>([]);
  readonly errorAgentes = signal('');
  readonly cargandoAgentes = signal(false);
  readonly prioridad = new FormControl('media', { nonNullable: true });
  readonly opcionesPrioridad = opcionesPrioridad;
  readonly agente = new FormControl('', { nonNullable: true });
  readonly opcionesAgentes = computed(() => {
    const list = [
      { valor: '', etiqueta: 'Sin asignar' },
      ...this.agentes().map((a) => ({ valor: a.id, etiqueta: a.fullName + ' · ' + a.email })),
    ];
    const actual = this.ticket()?.assignedAgent;
    if (actual && !list.some((a) => a.valor === actual.id))
      list.push({
        valor: actual.id,
        etiqueta: actual.fullName + ' (no disponible para nuevas asignaciones)',
      });
    return list;
  });
  readonly ocupada = signal(false);
  readonly errorAccion = signal('');
  readonly nota = new FormControl('', {
    nonNullable: true,
    validators: [
      (control) => {
        const longitud = String(control.value).trim().length;
        return longitud < 1 || longitud > 5000 ? { longitud: true } : null;
      },
    ],
  });
  readonly errorNota = signal('');
  readonly formularioNota = new FormGroup({ body: this.nota });
  readonly guardandoNota = signal(false);
  readonly cargandoContacto = signal(false);
  readonly avisoContacto = signal('');
  private contactoLectura = 0;
  private urlTelegram: string | null = null;
  private mensajeContacto = '';
  readonly pendiente = signal<{
    titulo: string;
    mensaje: string;
    accion?: AccionTicket;
    agentId?: string | null;
  } | null>(null);
  private actividadLectura = 0;
  readonly actividad = signal<EventoTicket[]>([]);
  readonly totalEventos = signal(0);
  readonly paginaEventos = signal(1);
  readonly tamanoEventos = signal(50);
  readonly cargandoActividad = signal(false);
  readonly errorActividad = signal('');
  readonly ticket = signal<Ticket | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly noEncontrado = signal(false);
  readonly recargar = new Subject<void>();
  constructor() {
    combineLatest([
      merge(
        this.ruta.paramMap.pipe(
          map((p) => p.get('id') ?? ''),
          filter((id) => !!id),
        ),
        this.identificador,
      ).pipe(distinctUntilChanged()),
      this.recargar.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([id]) => {
          this.cargando.set(true);
          this.error.set('');
          this.noEncontrado.set(false);
          this.ticket.set(null);
          this.actividad.set([]);
          this.pendiente.set(null);
          this.nota.reset();
          this.errorNota.set('');
          this.urlTelegram = null;
          this.avisoContacto.set('');
          return this.api.obtener(id).pipe(
            catchError((e) => {
              const f = interpretarError(e);
              this.noEncontrado.set(f.estado === 404);
              this.error.set(f.estado === 404 ? 'No se encontró el ticket.' : f.message);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe((t) => {
        this.ticket.set(t);
        this.agente.setValue(t.assignedAgent?.id ?? '');
        this.prioridad.setValue(t.priority);
        this.cargarActividad(1);
        this.cargarContacto();
        if (
          this.auth.usuario()?.role === 'supervisor' ||
          this.auth.usuario()?.role === 'administrador'
        )
          this.cargarAgentes();
      });
  }
  cargarAgentes() {
    this.cargandoAgentes.set(true);
    this.errorAgentes.set('');
    this.api
      .agentesAsignables()
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.cargandoAgentes.set(false)),
      )
      .subscribe({
        next: (a) => this.agentes.set(a),
        error: (e) => this.errorAgentes.set(interpretarError(e).message),
      });
  }
  cargarActividad(page = this.paginaEventos()) {
    const id = this.ticket()?.id;
    if (!id) return;
    const lectura = ++this.actividadLectura;
    this.paginaEventos.set(page);
    this.cargandoActividad.set(true);
    this.errorActividad.set('');
    this.api
      .eventos(id, page, this.tamanoEventos())
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (r) => {
          if (
            this.ticket()?.id !== id ||
            this.paginaEventos() !== page ||
            lectura !== this.actividadLectura
          )
            return;
          this.actividad.set(r.data);
          this.totalEventos.set(r.total);
          this.cargandoActividad.set(false);
        },
        error: (e) => {
          if (
            this.ticket()?.id === id &&
            this.paginaEventos() === page &&
            lectura === this.actividadLectura
          ) {
            this.errorActividad.set(interpretarError(e).message);
            this.cargandoActividad.set(false);
          }
        },
      });
  }
  tamanoActividad(n: number) {
    this.tamanoEventos.set(n);
    this.cargarActividad(1);
  }
  textoEvento(e: EventoTicket) {
    const nombre = e.actor.fullName;
    switch (e.type) {
      case 'created':
        return `${nombre} creó el ticket.`;
      case 'note_added':
        return `${nombre} agregó una nota interna.`;
      case 'assigned':
        return e.actor.id === e.toAgent?.id
          ? `${nombre} se asignó el ticket.`
          : `${nombre} asignó el ticket a ${e.toAgent?.fullName}.`;
      case 'reassigned':
        return `${nombre} reasignó el ticket de ${e.fromAgent?.fullName} a ${e.toAgent?.fullName}.`;
      case 'unassigned':
        return `${nombre} dejó el ticket sin asignar.`;
      case 'priority_changed':
        return `${nombre} cambió la prioridad de ${e.fromPriority ? etiquetasPrioridad[e.fromPriority] : ''} a ${e.toPriority ? etiquetasPrioridad[e.toPriority] : ''}.`;
      case 'status_changed':
        if (e.fromStatus === 'resuelto' && e.toStatus === 'en_proceso')
          return `${nombre} reabrió el ticket.`;
        if (e.toStatus === 'resuelto') return `${nombre} marcó el ticket como resuelto.`;
        if (e.toStatus === 'cerrado') return `${nombre} cerró el ticket.`;
        if (e.toStatus === 'cancelado') return `${nombre} canceló el ticket.`;
        return `${nombre} cambió el estado de ${e.fromStatus ? estados[e.fromStatus].etiqueta : ''} a ${e.toStatus ? estados[e.toStatus].etiqueta : ''}.`;
    }
  }
  etiquetaAccion(accion: AccionTicket) {
    return accion === 'reopen' &&
      ['supervisor', 'administrador'].includes(this.auth.usuario()?.role ?? '')
      ? 'Reabrir'
      : accionesTicket[accion].etiqueta;
  }
  actuar(accion: AccionTicket) {
    if (this.ocupada() || !this.permisos().acciones.includes(accion)) return;
    this.errorAccion.set('');
    const info = accionesTicket[accion];
    if (info.confirmar)
      this.pendiente.set({
        titulo: this.etiquetaAccion(accion),
        mensaje: `¿Confirmas la acción «${info.etiqueta}» sobre este ticket?`,
        accion,
      });
    else this.ejecutar({ titulo: this.etiquetaAccion(accion), mensaje: '', accion });
  }
  asignarme() {
    if (this.permisos().asignacion === 'propia')
      this.ejecutar({ titulo: 'Asignarme', mensaje: '', agentId: this.auth.usuario()!.id });
  }
  guardarAsignacion() {
    if (this.ocupada() || this.permisos().asignacion !== 'gestionar') return;
    const t = this.ticket()!;
    const id = this.agente.value || null;
    if (id === (t.assignedAgent?.id ?? null)) return;
    const nombre = this.agentes().find((a) => a.id === id)?.fullName;
    const p = {
      titulo: id ? 'Asignar ticket' : 'Desasignar ticket',
      mensaje: id
        ? `¿Reasignar este ticket de ${t.assignedAgent?.fullName} a ${nombre}?`
        : '¿Dejar este ticket sin agente asignado?',
      agentId: id,
    };
    this.errorAccion.set('');
    if (t.assignedAgent) this.pendiente.set(p);
    else this.ejecutar(p);
  }
  guardarPrioridad() {
    const priority = this.prioridad.value;
    if (
      this.ocupada() ||
      !this.permisos().prioridadEditable ||
      !esPrioridad(priority) ||
      priority === this.ticket()?.priority
    )
      return;
    this.ejecutar({ titulo: 'Cambiar prioridad', mensaje: '', prioridad: priority });
  }
  agregarNota() {
    this.nota.markAsTouched();
    const id = this.ticket()?.id;
    if (!id || this.ocupada() || !this.permisos().seguimientoEditable || this.nota.invalid) return;
    this.ocupada.set(true);
    this.gestionando.emit(true);
    this.guardandoNota.set(true);
    this.errorNota.set('');
    this.nota.disable();
    this.agente.disable();
    this.prioridad.disable();
    this.api
      .agregarNota(id, this.nota.value.trim())
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => {
          this.ocupada.set(false);
          if (!this.destruir.destroyed) this.gestionando.emit(false);
          this.guardandoNota.set(false);
          this.nota.enable();
          this.agente.enable();
          this.prioridad.enable();
        }),
      )
      .subscribe({
        next: () => {
          if (this.ticket()?.id !== id) return;
          this.nota.reset();
          this.cargarActividad(1);
          this.avisos.mostrar('Nota interna agregada.');
        },
        error: (e) => {
          if (this.ticket()?.id !== id) return;
          this.errorNota.set(interpretarError(e).message);
        },
      });
  }
  cargarContacto() {
    const lectura = ++this.contactoLectura;
    this.cargandoContacto.set(false);
    this.urlTelegram = null;
    this.avisoContacto.set('');
    this.mensajeContacto = 'Este ticket todavía no tiene un agente asignado.';
    const id = this.ticket()?.id;
    if (!id || !this.permisos().telegramVisible || !this.ticket()?.assignedAgent) return;
    const agente = this.ticket()!.assignedAgent!.id;
    this.cargandoContacto.set(true);
    this.api
      .contactoTelegram(id)
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (contacto) => {
          if (
            this.ticket()?.id !== id ||
            this.ticket()?.assignedAgent?.id !== agente ||
            lectura !== this.contactoLectura
          )
            return;
          this.cargandoContacto.set(false);
          if (contacto.available && this.esContactoSeguro(contacto.url))
            this.urlTelegram = contacto.url;
          this.mensajeContacto = contacto.available
            ? 'No se pudo abrir Telegram.'
            : contacto.message;
        },
        error: (error) => {
          if (
            this.ticket()?.id !== id ||
            this.ticket()?.assignedAgent?.id !== agente ||
            lectura !== this.contactoLectura
          )
            return;
          this.cargandoContacto.set(false);
          this.mensajeContacto = interpretarError(error).message;
          this.avisoContacto.set(this.mensajeContacto);
        },
      });
  }
  hablarPorTelegram() {
    if (!this.permisos().telegramVisible || this.cargandoContacto()) return;
    if (this.urlTelegram) window.open(this.urlTelegram, '_blank', 'noopener,noreferrer');
    else this.avisoContacto.set(this.mensajeContacto);
  }
  private esContactoSeguro(value: string) {
    try {
      const url = new URL(value);
      return (
        url.origin === 'https://t.me' &&
        !url.username &&
        !url.password &&
        !url.hash &&
        /^\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(url.pathname) &&
        [...url.searchParams.keys()].every((key) => key === 'text') &&
        url.searchParams.getAll('text').length <= 1
      );
    } catch {
      return false;
    }
  }
  confirmar() {
    const p = this.pendiente();
    if (p) this.ejecutar(p);
  }
  private ejecutar(p: {
    titulo: string;
    mensaje: string;
    accion?: AccionTicket;
    agentId?: string | null;
    prioridad?: TicketPriority;
  }) {
    if (this.ocupada()) return;
    const id = this.ticket()?.id;
    if (!id) return;
    this.ocupada.set(true);
    this.gestionando.emit(true);
    this.errorAccion.set('');
    this.agente.disable();
    this.prioridad.disable();
    const peticion = p.prioridad
      ? this.api.cambiarPrioridad(id, p.prioridad)
      : p.accion
        ? this.api.transicion(id, p.accion)
        : this.api.asignar(id, p.agentId ?? null);
    peticion
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => {
          this.ocupada.set(false);
          if (!this.destruir.destroyed) this.gestionando.emit(false);
          this.agente.enable();
          this.prioridad.enable();
        }),
      )
      .subscribe({
        next: (t) => {
          if (this.ticket()?.id !== id) return;
          const anterior = this.ticket()!.assignedAgent;
          this.ticket.set(t);
          this.agente.setValue(t.assignedAgent?.id ?? '');
          this.prioridad.setValue(t.priority);
          this.cargarContacto();
          this.pendiente.set(null);
          this.cargarActividad(1);
          const mensaje = p.prioridad
            ? `Prioridad actualizada a ${etiquetasPrioridad[t.priority]}.`
            : p.accion
              ? accionesTicket[p.accion].exito
              : !t.assignedAgent
                ? 'El ticket quedó sin agente asignado.'
                : t.assignedAgent.id === this.auth.usuario()?.id
                  ? `Te asignaste el ticket ${t.number}.`
                  : `Ticket ${anterior ? 'reasignado' : 'asignado'} a ${t.assignedAgent.fullName}.`;
          this.avisos.mostrar(mensaje);
          this.actualizado.emit(t);
        },
        error: (e) => {
          if (this.ticket()?.id !== id) return;
          const f = interpretarError(e);
          this.errorAccion.set(f.message);
          this.pendiente.set(null);
          if ([403, 404, 409].includes(f.estado)) {
            this.avisos.mostrar(
              f.estado === 409
                ? `${f.message} El ticket cambió mientras lo estabas viendo. Se actualizaron sus datos.`
                : f.message,
              true,
            );
            this.recargar.next();
          }
        },
      });
  }
}
