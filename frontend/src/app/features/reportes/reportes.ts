import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { Subject, catchError, finalize, forkJoin, map, merge, of, switchMap, tap } from 'rxjs';
import { ReportesApi } from '../../core/reportes/reportes-api';
import { Reports, ReportOptions, CategoryItem } from '../../core/reportes/modelos';
import {
  VistaReportes,
  Rango,
  fechasRapidas,
  rangoValido,
  filtrosUtc,
  duracion,
  fechaBucket,
} from '../../core/reportes/fechas';
import { estados } from '../../shared/ui/insignia-estado';
import { etiquetasPrioridad } from '../../core/tickets/prioridad';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Boton } from '../../shared/ui/boton';
import { Alerta } from '../../shared/ui/alerta';
import { Selector } from '../../shared/ui/selector';
import { CampoFecha } from '../../shared/ui/campo-fecha';
import { BarrasReporte, BarraReporte } from './barras-reporte';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';

export function leerVista(params: ParamMap, now = new Date()): VistaReportes {
  const raw = params.get('range');
  const range: Rango = raw === '7' || raw === '90' || raw === 'personalizado' ? raw : '30';
  const fallback = fechasRapidas(range === 'personalizado' ? 30 : Number(range), now);
  const from = params.get('from') ?? fallback.from,
    to = params.get('to') ?? fallback.to;
  const id = (key: string) => {
    const value = params.get(key) ?? '';
    return /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n ? value : '';
  };
  return {
    range,
    ...(rangoValido(from, to) ? { from, to } : fallback),
    categoryId: id('categoryId'),
    agentId: id('agentId'),
  };
}
export function barrasCategorias(items: CategoryItem[]): BarraReporte[] {
  const rows = items.slice(0, 10).map((i) => ({
    etiqueta: i.category.name + (i.category.isActive ? '' : ' (inactiva)'),
    cantidad: i.count,
    clase: 'bg-primario',
  }));
  if (items.length > 10)
    rows.push({
      etiqueta: 'Otras',
      cantidad: items.slice(10).reduce((n, i) => n + i.count, 0),
      clase: 'bg-primario',
    });
  return rows;
}
@Component({
  selector: 'app-reportes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    Tarjeta,
    Boton,
    Alerta,
    Selector,
    CampoFecha,
    BarrasReporte,
    AvisoFlotante,
  ],
  templateUrl: './reportes.html',
})
export class Reportes {
  private readonly api = inject(ReportesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly documento = inject(DOCUMENT);
  private readonly avisos = inject(Avisos);
  readonly exportando = signal(false);
  readonly recargar = new Subject<void>();
  readonly datos = signal<Reports | null>(null);
  readonly opciones = signal<ReportOptions>({ categories: [], agents: [] });
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly errorFechas = signal('');
  readonly vista = signal(leerVista(this.route.snapshot.queryParamMap));
  readonly formulario = inject(FormBuilder).nonNullable.group(this.vista());
  readonly rangos = [
    { valor: '7', etiqueta: '7 días' },
    { valor: '30', etiqueta: '30 días' },
    { valor: '90', etiqueta: '90 días' },
    { valor: 'personalizado', etiqueta: 'Personalizado' },
  ];
  readonly categorias = computed(() => [
    { valor: '', etiqueta: 'Todas las categorías' },
    ...this.opciones().categories.map((c) => ({
      valor: c.id,
      etiqueta: c.name + (c.isActive ? '' : ' (inactiva)'),
    })),
  ]);
  readonly agentes = computed(() => [
    { valor: '', etiqueta: 'Todos los agentes' },
    ...this.opciones().agents.map((a) => ({
      valor: a.id,
      etiqueta: a.fullName + (a.isActive ? '' : ' (inactivo)'),
    })),
  ]);
  readonly duracion = duracion;
  readonly fechaBucket = fechaBucket;
  readonly series = [
    { clave: 'created', etiqueta: 'Creados', clase: 'bg-primario' },
    { clave: 'resolved', etiqueta: 'Resueltos', clase: 'bg-exito' },
    { clave: 'closed', etiqueta: 'Cerrados', clase: 'bg-estado-cerrado' },
    { clave: 'canceled', etiqueta: 'Cancelados', clase: 'bg-peligro' },
  ] as const;
  readonly granularidad = computed(
    () =>
      ({ day: 'día', week: 'semana (lunes)', month: 'mes' })[
        this.datos()?.trend.granularity ?? 'day'
      ],
  );
  readonly maximoTendencia = computed(() =>
    Math.max(
      1,
      ...(this.datos()?.trend.items.flatMap((i) => this.series.map((s) => i[s.clave])) ?? []),
    ),
  );
  readonly barrasEstado = computed(
    () =>
      this.datos()?.statuses.items.map((i) => ({
        etiqueta: estados[i.status].etiqueta,
        cantidad: i.count,
        clase: {
          creado: 'bg-estado-creado',
          en_proceso: 'bg-estado-en-proceso',
          en_espera: 'bg-estado-en-espera',
          resuelto: 'bg-estado-resuelto',
          cerrado: 'bg-estado-cerrado',
          cancelado: 'bg-estado-cancelado',
        }[i.status],
      })) ?? [],
  );
  readonly barrasPrioridad = computed(
    () =>
      this.datos()?.priorities.items.map((i) => ({
        etiqueta: etiquetasPrioridad[i.priority],
        cantidad: i.count,
        clase: {
          baja: 'bg-info',
          media: 'bg-estado-creado',
          alta: 'bg-aviso',
          urgente: 'bg-peligro',
        }[i.priority],
      })) ?? [],
  );
  readonly barrasCategoria = computed(() => barrasCategorias(this.datos()?.categories.items ?? []));
  readonly sinEventos = computed(() => {
    const k = this.datos()?.summary.kpis;
    return k ? k.created + k.resolved + k.closed + k.canceled === 0 : false;
  });
  constructor() {
    this.formulario.controls.range.valueChanges.pipe(takeUntilDestroyed()).subscribe((range) => {
      if (range !== 'personalizado')
        this.formulario.patchValue(fechasRapidas(Number(range)), { emitEvent: false });
    });
    for (const control of [this.formulario.controls.from, this.formulario.controls.to]) {
      control.valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() =>
          this.formulario.controls.range.setValue('personalizado', { emitEvent: false }),
        );
    }
    merge(
      this.route.queryParamMap,
      this.recargar.pipe(map(() => this.route.snapshot.queryParamMap)),
    )
      .pipe(
        map((params) => leerVista(params)),
        tap((vista) => {
          this.vista.set(vista);
          this.formulario.reset(vista, { emitEvent: false });
          this.cargando.set(true);
          this.error.set('');
          this.errorFechas.set('');
          this.datos.set(null);
        }),
        switchMap((vista) =>
          forkJoin({
            datos: this.api.cargar(filtrosUtc(vista)),
            opciones: this.api.opciones(),
          }).pipe(
            catchError(() => {
              this.error.set('No fue posible cargar los reportes.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (resultado) {
          this.datos.set(resultado.datos);
          this.opciones.set(resultado.opciones);
        }
        this.cargando.set(false);
      });
  }
  exportar() {
    if (this.exportando() || this.cargando() || !this.datos()) return;
    this.exportando.set(true);
    // Se exporta la vista aplicada, aunque existan cambios pendientes en el formulario.
    this.api
      .exportar(filtrosUtc(this.vista()))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exportando.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.body) {
            this.avisos.mostrar('No fue posible exportar el reporte.', true);
            return;
          }
          const filename =
            /filename="(helpdesk-reporte-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv)"/i.exec(
              response.headers.get('Content-Disposition') ?? '',
            )?.[1] ?? 'helpdesk-reporte.csv';
          const url = URL.createObjectURL(response.body);
          const enlace = this.documento.createElement('a');
          enlace.href = url;
          enlace.download = filename;
          this.documento.body.append(enlace);
          enlace.click();
          enlace.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        },
        error: () => this.avisos.mostrar('No fue posible exportar el reporte.', true),
      });
  }
  aplicar() {
    const value = this.formulario.getRawValue();
    if (!rangoValido(value.from, value.to)) {
      this.errorFechas.set(
        'Indica fechas válidas, Desde anterior o igual a Hasta y un máximo de 365 días.',
      );
      return;
    }
    this.errorFechas.set('');
    const queryParams = {
      ...value,
      categoryId: value.categoryId || null,
      agentId: value.agentId || null,
    };
    const target = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    if (this.router.serializeUrl(target) === this.router.url) this.recargar.next();
    else void this.router.navigateByUrl(target);
  }
}
