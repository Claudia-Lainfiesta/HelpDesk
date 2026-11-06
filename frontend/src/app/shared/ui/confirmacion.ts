import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Modal } from './modal';
import { Boton } from './boton';
import { Alerta } from './alerta';
@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [Modal, Boton, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-modal [titulo]="titulo()" [ocupado]="cargando()" (cerrar)="cancelar.emit()">
    <p class="leading-relaxed text-texto-suave">{{ mensaje() }}</p>
    @if (error()) {
      <app-alerta variante="peligro" class="mt-4 block">{{ error() }}</app-alerta>
    }
    <div class="mt-6 flex flex-wrap justify-end gap-3">
      <app-boton variante="secundario" [deshabilitado]="cargando()" (accion)="cancelar.emit()"
        >Cancelar</app-boton
      ><app-boton
        [variante]="peligro() ? 'peligro' : 'primario'"
        [cargando]="cargando()"
        (accion)="confirmar.emit()"
        >{{ etiqueta() }}</app-boton
      >
    </div></app-modal
  >`,
})
export class Confirmacion {
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly etiqueta = input('Confirmar');
  readonly peligro = input(false);
  readonly cargando = input(false);
  readonly error = input('');
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
