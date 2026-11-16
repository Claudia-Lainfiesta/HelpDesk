import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Boton } from './boton';
import { Alerta } from './alerta';
@Component({
  selector: 'app-tabla-paginada',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [Boton, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (cargando()) {
      <div
        role="status"
        class="rounded-tarjeta border border-linea bg-superficie p-10 text-center text-texto-suave"
      >
        Cargando {{ nombre() }}…
      </div>
    } @else if (error()) {
      <app-alerta variante="peligro"
        >{{ error() }}
        <div class="mt-3">
          <app-boton variante="secundario" tamano="sm" (accion)="reintentar.emit()"
            >Reintentar</app-boton
          >
        </div></app-alerta
      >
    } @else if (vacia()) {
      <div
        class="rounded-tarjeta border border-linea bg-superficie p-10 text-center shadow-tarjeta"
      >
        <p class="font-semibold text-primario">No hay {{ nombre() }} para mostrar.</p>
        <p class="mt-2 text-texto-suave">{{ sugerencia() }}</p>
      </div>
    } @else {
      <div
        role="region"
        [attr.aria-label]="'Lista de ' + nombre()"
        class="relative pb-2"
        [style.--columnas]="rejilla()"
      >
        <div role="table" [attr.aria-label]="nombre()">
          <div
            role="row"
            class="sr-only items-center gap-4 text-xs font-semibold text-texto-suave uppercase xl:not-sr-only xl:mb-3 xl:grid xl:px-5"
            [style.grid-template-columns]="rejilla()"
          >
            @for (columna of columnas(); track columna) {
              <span role="columnheader">{{ columna }}</span>
            }
          </div>
          <div role="rowgroup" class="space-y-3"><ng-content /></div>
        </div>
      </div>
    }`,
})
export class TablaPaginada {
  readonly nombre = input.required<string>();
  readonly columnas = input.required<readonly string[]>();
  readonly rejilla = input.required<string>();
  readonly cargando = input(false);
  readonly vacia = input(false);
  readonly error = input('');
  readonly sugerencia = input('Prueba otros filtros o agrega un registro con el botón de alta.');
  readonly reintentar = output<void>();
}
