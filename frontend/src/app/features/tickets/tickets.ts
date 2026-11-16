import {
  afterNextRender,
  ElementRef,
  Injector,
  viewChild,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  startWith,
  switchMap,
} from 'rxjs';
import { TicketsApi, Ticket, FiltrosTickets } from '../../core/tickets/tickets-api';
import { CategoriasApi } from '../../core/administracion/categorias-api';
import { Categoria } from '../../core/administracion/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/auth/fallo-api';
import { FechaLocal } from '../../core/administracion/fechas';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Selector } from '../../shared/ui/selector';
import { Filtro } from '../../shared/ui/filtro';
import { InsigniaEstado, estados, EstadoTicket } from '../../shared/ui/insignia-estado';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Paginador } from '../../shared/ui/paginador';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';
import { Alerta } from '../../shared/ui/alerta';
import { InsigniaPrioridad } from '../../shared/ui/insignia-prioridad';
import { esPrioridad, opcionesPrioridad } from '../../core/tickets/prioridad';
import { FormularioTicket } from './formulario-ticket';
import { VistaPreviaTicket } from './vista-previa-ticket';
import { Icono } from '../../shared/ui/icono';
export function leerFiltrosTickets(p: { get: (k: string) => string | null }): FiltrosTickets {
  const status = p.get('status');
  const priority = p.get('priority');
  const page = Number(p.get('page'));
  const size = Number(p.get('pageSize'));
  const id = p.get('categoryId');
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 1000000 ? page : 1,
    pageSize: [10, 20, 50].includes(size) ? size : 20,
    search: (p.get('search') ?? '').trim().slice(0, 160) || undefined,
    status: status && Object.hasOwn(estados, status) ? (status as EstadoTicket) : undefined,
    priority: esPrioridad(priority) ? priority : undefined,
    categoryId:
      id && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n ? id : undefined,
  };
}
@Component({
  selector: 'app-tickets',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [
    ReactiveFormsModule,
    Boton,
    CampoTexto,
    Selector,
    Filtro,
    InsigniaEstado,
    InsigniaPrioridad,
    Tarjeta,
    VistaPreviaTicket,
    Icono,
    Paginador,
    FechaLocal,
    FormularioTicket,
    AvisoFlotante,
    Alerta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tickets.html',
})
export class Tickets {
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly inyector = inject(Injector);
  private readonly panelVista = viewChild<ElementRef<HTMLElement>>('panelVista');
  readonly seleccionado = signal<string | null>(null);
  readonly seleccionActual = computed(() => (this.seleccionado() ? [this.seleccionado()!] : []));
  readonly gestionando = signal(false);
  seleccionar(id: string) {
    if (this.gestionando()) return;
    this.seleccionado.set(id);
    afterNextRender(
      () => {
        if (!window.matchMedia?.('(min-width: 1024px)').matches)
          this.panelVista()?.nativeElement.focus();
      },
      { injector: this.inyector },
    );
  }
  volverALista() {
    if (this.gestionando()) return;
    const id = this.seleccionado();
    this.seleccionado.set(null);
    afterNextRender(
      () => {
        Array.from(
          this.elemento.nativeElement.querySelectorAll<HTMLButtonElement>('button[data-ticket]'),
        )
          .find((b) => b.dataset['ticket'] === id)
          ?.focus();
      },
      { injector: this.inyector },
    );
  }
  actualizarTicket(ticket: Ticket) {
    this.tickets.update((lista) => lista.map((t) => (t.id === ticket.id ? ticket : t)));
    this.recargar.next();
  }
  private readonly api = inject(TicketsApi);
  private readonly categoriasApi = inject(CategoriasApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly avisos = inject(Avisos);
  private readonly auth = inject(AuthService);
  readonly tickets = signal<Ticket[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly filtros = signal<FiltrosTickets>({ page: 1, pageSize: 20 });
  readonly recargar = new Subject<void>();
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly prioridad = new FormControl('', { nonNullable: true });
  readonly opcionesPrioridad = [{ valor: '', etiqueta: 'Todas' }, ...opcionesPrioridad];
  readonly categoria = new FormControl('', { nonNullable: true });
  readonly categorias = signal<Categoria[]>([]);
  readonly errorCategorias = signal('');
  readonly nuevoAbierto = signal(false);
  readonly estados = Object.entries(estados).map(([codigo, v]) => ({
    codigo: codigo as EstadoTicket,
    etiqueta: v.etiqueta,
  }));
  readonly tieneFiltros = computed(
    () =>
      !!(
        this.filtros().search ||
        this.filtros().status ||
        this.filtros().categoryId ||
        this.filtros().priority
      ),
  );
  readonly opcionesCategorias = computed(() => {
    const opciones = [
      { valor: '', etiqueta: 'Todas las categorías' },
      ...this.categorias().map((c) => ({
        valor: c.id,
        etiqueta: c.name + (c.isActive ? '' : ' (inactiva)'),
      })),
    ];
    const id = this.filtros().categoryId;
    if (id && !opciones.some((o) => o.valor === id))
      opciones.push({ valor: id, etiqueta: 'Categoría histórica seleccionada' });
    return opciones;
  });
  constructor() {
    this.cargarCategorias();
    combineLatest([this.ruta.queryParamMap, this.recargar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([p]) => {
          const f = leerFiltrosTickets(p);
          this.filtros.set(f);
          this.busqueda.setValue(f.search ?? '', { emitEvent: false });
          this.categoria.setValue(f.categoryId ?? '', { emitEvent: false });
          this.prioridad.setValue(f.priority ?? '', { emitEvent: false });
          this.cargando.set(true);
          this.error.set('');
          return this.api.listar(f).pipe(
            catchError((e) => {
              this.error.set(interpretarError(e).message);
              this.tickets.set([]);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe((r) => {
        this.tickets.set(r.data);
        this.total.set(r.total);
        if (this.seleccionado() && !r.data.some((t) => t.id === this.seleccionado()))
          this.seleccionado.set(null);
        if (!r.data.length && r.total > 0 && r.page > 1)
          this.pagina(Math.max(1, Math.ceil(r.total / r.pageSize)));
      });
    this.busqueda.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir))
      .subscribe((search) => this.filtrar({ search: search.trim() || undefined }));
    this.prioridad.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((priority) =>
        this.filtrar({ priority: esPrioridad(priority) ? priority : undefined }),
      );
    this.categoria.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((categoryId) => this.filtrar({ categoryId: categoryId || undefined }));
  }
  cargarCategorias() {
    this.errorCategorias.set('');
    this.categoriasApi
      .listar(this.auth.usuario()?.role === 'administrador')
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (r) => this.categorias.set(r.data),
        error: (e) => this.errorCategorias.set(interpretarError(e).message),
      });
  }
  filtrar(cambios: Partial<FiltrosTickets>) {
    if (this.gestionando()) return;
    this.navegar({ ...this.filtros(), ...cambios, page: 1 });
  }
  pagina(page: number) {
    if (this.gestionando()) return;
    this.navegar({ ...this.filtros(), page });
  }
  limpiar() {
    if (this.gestionando()) return;
    this.navegar({ page: 1, pageSize: this.filtros().pageSize });
  }
  private navegar(f: FiltrosTickets) {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: f });
  }
  creado(ticket: Ticket) {
    this.nuevoAbierto.set(false);
    this.avisos.mostrar(`Ticket ${ticket.number} creado correctamente.`);
    this.recargar.next();
    void this.router.navigate(['/tickets', ticket.id]);
  }
}
