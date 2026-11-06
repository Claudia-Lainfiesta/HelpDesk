import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ControlCampo } from './control-campo';
export interface OpcionSelector {
  valor: string;
  etiqueta: string;
  deshabilitada?: boolean;
}

@Component({
  selector: 'app-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Selector), multi: true }],
  template: `<label
      [for]="identificador()"
      [class]="ocultarEtiqueta() ? 'sr-only' : 'mb-2 block font-semibold text-texto-suave'"
      >{{ etiqueta() }}</label
    ><select
      [id]="identificador()"
      [value]="valor()"
      [disabled]="deshabilitado()"
      [attr.aria-describedby]="descripcion() || null"
      [attr.aria-invalid]="error() ? 'true' : null"
      (blur)="tocar()"
      (change)="escribir($event)"
      class="h-[46px] w-full rounded-boton border border-linea bg-superficie-suave px-4 text-texto disabled:opacity-60"
    >
      @for (opcion of opciones(); track opcion.valor) {
        <option
          [value]="opcion.valor"
          [selected]="opcion.valor === valor()"
          [disabled]="opcion.deshabilitada || false"
        >
          {{ opcion.etiqueta }}
        </option>
      }
    </select>
    @if (ayuda()) {
      <p [id]="identificador() + '-ayuda'" class="mt-2 text-xs text-texto-suave">{{ ayuda() }}</p>
    }
    @if (error()) {
      <p [id]="identificador() + '-error'" class="mt-2 text-xs text-peligro" role="alert">
        {{ error() }}
      </p>
    }`,
})
export class Selector extends ControlCampo {
  readonly opciones = input.required<readonly OpcionSelector[]>();
}
