import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap } from 'rxjs';
import { CategoriasApi } from '../../core/administracion/categorias-api';
import { Categoria } from '../../core/administracion/modelos';
import { errorAdministracion } from '../../core/administracion/errores';
import { Boton } from '../../shared/ui/boton';
import { Interruptor } from '../../shared/ui/interruptor';
import { TablaPaginada } from '../../shared/ui/tabla-paginada';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { InsigniaCuenta } from '../../shared/ui/insignia-cuenta';
import { MenuAcciones } from '../../shared/ui/menu-acciones';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';
import { FormularioCategoria } from './formulario-categoria';
@Component({
  selector: 'app-categorias',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [
    ReactiveFormsModule,
    Boton,
    Interruptor,
    TablaPaginada,
    Tarjeta,
    InsigniaCuenta,
    MenuAcciones,
    Confirmacion,
    AvisoFlotante,
    FormularioCategoria,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1>Categorías</h1>
        <p class="mt-2 text-texto-suave">Organiza los motivos de las solicitudes de soporte.</p>
      </div>
      <app-boton icono="mas" (accion)="nueva()">Nueva categoría</app-boton>
    </div>
    <div class="mb-6">
      <app-interruptor
        identificador="categorias-inactivas"
        etiqueta="Mostrar inactivas"
        [formControl]="inactivas"
      />
    </div>
    <app-tabla-paginada
      nombre="categorías"
      [columnas]="['Nombre', 'Descripción', 'Estado', 'Acciones']"
      [rejilla]="rejilla"
      [anchoMinimo]="760"
      [cargando]="cargando()"
      [error]="error()"
      [vacia]="!categorias().length"
      (reintentar)="recargar.next()"
    >
      @for (categoria of categorias(); track categoria.id) {
        <app-tarjeta
          role="row"
          class="grid items-center gap-4 px-5 py-4"
          [style.grid-template-columns]="rejilla"
          ><div role="cell" class="font-semibold text-texto">{{ categoria.name }}</div>
          <div role="cell" class="break-words text-texto-suave">
            {{ categoria.description || 'Sin descripción' }}
          </div>
          <div role="cell">
            <app-insignia-cuenta [tipo]="categoria.isActive ? 'Activa' : 'Inactiva'" />
          </div>
          <div role="cell">
            <app-menu-acciones
              [nombre]="categoria.name"
              [acciones]="[
                { codigo: 'editar', etiqueta: 'Editar' },
                {
                  codigo: 'activar',
                  etiqueta: categoria.isActive ? 'Desactivar' : 'Reactivar',
                  peligro: categoria.isActive,
                },
              ]"
              (seleccionado)="elegir(categoria, $event)"
            /></div
        ></app-tarjeta>
      }
    </app-tabla-paginada>
    @if (formularioAbierto()) {
      <app-formulario-categoria
        [categoria]="editarCategoria()"
        (cerrar)="formularioAbierto.set(false); editarCategoria.set(null)"
        (guardado)="guardada()"
      />
    }
    @if (pendiente(); as categoria) {
      <app-confirmacion
        [titulo]="categoria.isActive ? 'Desactivar categoría' : 'Reactivar categoría'"
        [mensaje]="
          categoria.isActive
            ? 'La categoría dejará de ofrecerse en tickets nuevos; los tickets existentes la conservan.'
            : 'La categoría volverá a ofrecerse en tickets nuevos.'
        "
        [etiqueta]="categoria.isActive ? 'Desactivar' : 'Reactivar'"
        [peligro]="categoria.isActive"
        [cargando]="procesando()"
        [error]="errorAccion()"
        (cancelar)="pendiente.set(null)"
        (confirmar)="confirmar()"
      />
    }
    <app-aviso-flotante />`,
})
export class Categorias {
  private readonly api = inject(CategoriasApi);
  private readonly destruir = inject(DestroyRef);
  private readonly avisos = inject(Avisos);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly inactivas = new FormControl(false, { nonNullable: true });
  readonly recargar = new Subject<void>();
  readonly rejilla = 'minmax(160px, 1fr) minmax(260px, 2fr) 120px 80px';
  readonly formularioAbierto = signal(false);
  readonly editarCategoria = signal<Categoria | null>(null);
  readonly pendiente = signal<Categoria | null>(null);
  readonly procesando = signal(false);
  readonly errorAccion = signal('');
  constructor() {
    combineLatest([
      this.inactivas.valueChanges.pipe(startWith(false)),
      this.recargar.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([incluir]) => {
          this.cargando.set(true);
          this.error.set('');
          return this.api.listar(incluir).pipe(
            catchError((error) => {
              this.error.set(errorAdministracion(error).mensaje);
              this.categorias.set([]);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe((respuesta) => this.categorias.set(respuesta.data));
  }
  nueva() {
    this.editarCategoria.set(null);
    this.formularioAbierto.set(true);
  }
  elegir(categoria: Categoria, accion: string) {
    if (accion === 'editar') {
      this.editarCategoria.set(categoria);
      this.formularioAbierto.set(true);
    } else {
      this.errorAccion.set('');
      this.pendiente.set(categoria);
    }
  }
  guardada() {
    this.formularioAbierto.set(false);
    this.editarCategoria.set(null);
    this.recargar.next();
    this.avisos.mostrar('Categoría guardada correctamente.');
  }
  confirmar() {
    const categoria = this.pendiente();
    if (!categoria || this.procesando()) return;
    this.procesando.set(true);
    this.api
      .editar(categoria.id, { isActive: !categoria.isActive })
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.pendiente.set(null);
          this.recargar.next();
          this.avisos.mostrar(
            categoria.isActive ? 'Categoría desactivada.' : 'Categoría reactivada.',
          );
        },
        error: (error) => {
          const mensaje = errorAdministracion(error).mensaje;
          this.errorAccion.set(mensaje);
          this.avisos.mostrar(mensaje, true);
        },
      });
  }
}
