import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { TablaPaginada } from '../../shared/ui/tabla-paginada';
import { Paginador } from '../../shared/ui/paginador';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';
import { Alerta } from '../../shared/ui/alerta';
import { FormularioTicket } from './formulario-ticket';
export function leerFiltrosTickets(p: { get: (k: string) => string | null }): FiltrosTickets {
  const status = p.get('status');
  const page = Number(p.get('page'));
  const size = Number(p.get('pageSize'));
  const id = p.get('categoryId');
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 1000000 ? page : 1,
    pageSize: [10, 20, 50].includes(size) ? size : 20,
    search: (p.get('search') ?? '').trim().slice(0, 160) || undefined,
    status: status && Object.hasOwn(estados, status) ? (status as EstadoTicket) : undefined,
    categoryId:
      id && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n ? id : undefined,
  };
}
@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Boton,
    CampoTexto,
    Selector,
    Filtro,
    InsigniaEstado,
    Tarjeta,
    TablaPaginada,
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
  readonly categoria = new FormControl('', { nonNullable: true });
  readonly categorias = signal<Categoria[]>([]);
  readonly errorCategorias = signal('');
  readonly nuevoAbierto = signal(false);
  readonly columnas = ['Ticket', 'Asunto', 'Categoría', 'Estado', 'Agente', 'Fecha'];
  readonly rejilla = '110px minmax(220px, 1fr) 150px 130px 140px 150px';
  readonly estados = Object.entries(estados).map(([codigo, v]) => ({
    codigo: codigo as EstadoTicket,
    etiqueta: v.etiqueta,
  }));
  readonly tieneFiltros = computed(
    () => !!(this.filtros().search || this.filtros().status || this.filtros().categoryId),
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
        if (!r.data.length && r.total > 0 && r.page > 1)
          this.pagina(Math.max(1, Math.ceil(r.total / r.pageSize)));
      });
    this.busqueda.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir))
      .subscribe((search) => this.filtrar({ search: search.trim() || undefined }));
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
    this.navegar({ ...this.filtros(), ...cambios, page: 1 });
  }
  pagina(page: number) {
    this.navegar({ ...this.filtros(), page });
  }
  limpiar() {
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
