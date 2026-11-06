import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap } from 'rxjs';
import { TicketsApi, Ticket, EventoTicket, PersonaTicket } from '../../core/tickets/tickets-api';
import { interpretarError } from '../../core/auth/fallo-api';
import { FechaLocal } from '../../core/administracion/fechas';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Alerta } from '../../shared/ui/alerta';
import { Boton } from '../../shared/ui/boton';
import { InsigniaEstado } from '../../shared/ui/insignia-estado';
import { AuthService } from '../../core/auth/auth.service';
import { AccionTicket, accionesTicket, permisosTicket } from '../../core/tickets/permisos-ticket';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Selector } from '../../shared/ui/selector';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { Paginador } from '../../shared/ui/paginador';
import { estados } from '../../shared/ui/insignia-estado';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';
@Component({
  selector: 'app-detalle-ticket',
  standalone: true,
  imports: [
    RouterLink,
    FechaLocal,
    Tarjeta,
    Alerta,
    Boton,
    InsigniaEstado,
    AvisoFlotante,
    ReactiveFormsModule,
    Selector,
    Confirmacion,
    Paginador,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-ticket.html',
})
export class DetalleTicket {
  private readonly api = inject(TicketsApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(Avisos);
  readonly catalogoAcciones = accionesTicket;
  readonly permisos = computed(() =>
    this.ticket()
      ? permisosTicket(this.ticket()!, this.auth.usuario())
      : { asignacion: 'ninguna', acciones: [] as AccionTicket[] },
  );
  readonly agentes = signal<PersonaTicket[]>([]);
  readonly errorAgentes = signal('');
  readonly cargandoAgentes = signal(false);
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
    combineLatest([this.ruta.paramMap, this.recargar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([p]) => {
          this.cargando.set(true);
          this.error.set('');
          this.noEncontrado.set(false);
          this.ticket.set(null);
          this.actividad.set([]);
          this.pendiente.set(null);
          return this.api.obtener(p.get('id') ?? '').pipe(
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
        this.cargarActividad(1);
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
      case 'assigned':
        return e.actor.id === e.toAgent?.id
          ? `${nombre} se asignó el ticket.`
          : `${nombre} asignó el ticket a ${e.toAgent?.fullName}.`;
      case 'reassigned':
        return `${nombre} reasignó el ticket de ${e.fromAgent?.fullName} a ${e.toAgent?.fullName}.`;
      case 'unassigned':
        return `${nombre} dejó el ticket sin asignar.`;
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
  confirmar() {
    const p = this.pendiente();
    if (p) this.ejecutar(p);
  }
  private ejecutar(p: {
    titulo: string;
    mensaje: string;
    accion?: AccionTicket;
    agentId?: string | null;
  }) {
    if (this.ocupada()) return;
    const id = this.ticket()?.id;
    if (!id) return;
    this.ocupada.set(true);
    this.errorAccion.set('');
    this.agente.disable();
    const peticion = p.accion
      ? this.api.transicion(id, p.accion)
      : this.api.asignar(id, p.agentId ?? null);
    peticion
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => {
          this.ocupada.set(false);
          this.agente.enable();
        }),
      )
      .subscribe({
        next: (t) => {
          if (this.ticket()?.id !== id) return;
          const anterior = this.ticket()!.assignedAgent;
          this.ticket.set(t);
          this.agente.setValue(t.assignedAgent?.id ?? '');
          this.pendiente.set(null);
          this.cargarActividad(1);
          const mensaje = p.accion
            ? accionesTicket[p.accion].exito
            : !t.assignedAgent
              ? 'El ticket quedó sin agente asignado.'
              : t.assignedAgent.id === this.auth.usuario()?.id
                ? `Te asignaste el ticket ${t.number}.`
                : `Ticket ${anterior ? 'reasignado' : 'asignado'} a ${t.assignedAgent.fullName}.`;
          this.avisos.mostrar(mensaje);
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
