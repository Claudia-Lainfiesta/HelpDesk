import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Boton } from './boton';
import { NombreIcono } from './icono';
import { AccionFila } from './menu-acciones';

export interface AccionIconografica extends AccionFila {
  icono: NombreIcono;
}

@Component({
  selector: 'app-acciones-fila',
  standalone: true,
  imports: [Boton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="flex flex-wrap items-center gap-1"
    role="group"
    [attr.aria-label]="'Acciones de ' + nombre()"
  >
    @for (accion of acciones(); track accion.codigo) {
      <app-boton
        variante="fantasma"
        [iconoPeligro]="accion.peligro ?? false"
        [icono]="accion.icono"
        [soloIcono]="true"
        [etiquetaAccesible]="accion.etiqueta + ' ' + nombre()"
        [ayuda]="accion.explicacion || accion.etiqueta + ' ' + nombre()"
        [deshabilitado]="accion.deshabilitada ?? false"
        (accion)="seleccionado.emit(accion.codigo)"
      />
    }
  </div>`,
})
export class AccionesFila {
  readonly nombre = input.required<string>();
  readonly acciones = input.required<readonly AccionIconografica[]>();
  readonly seleccionado = output<string>();
}
