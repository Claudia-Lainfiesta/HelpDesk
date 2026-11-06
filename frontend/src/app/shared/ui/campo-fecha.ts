import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ControlCampo } from './control-campo';

@Component({
  selector: 'app-campo-fecha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoFecha), multi: true },
  ],
  template: `<label
      [for]="identificador()"
      [class]="ocultarEtiqueta() ? 'sr-only' : 'mb-2 block font-semibold text-texto-suave'"
      >{{ etiqueta() }}</label
    ><input
      type="datetime-local"
      [id]="identificador()"
      [value]="valor()"
      [disabled]="deshabilitado()"
      [attr.aria-describedby]="descripcion() || null"
      [attr.aria-invalid]="error() ? 'true' : null"
      (blur)="tocar()"
      (input)="escribir($event)"
      class="h-[46px] w-full rounded-boton border border-linea bg-superficie-suave px-4 text-texto disabled:opacity-60"
    />
    @if (ayuda()) {
      <p [id]="identificador() + '-ayuda'" class="mt-2 text-xs text-texto-suave">{{ ayuda() }}</p>
    }
    @if (error()) {
      <p [id]="identificador() + '-error'" class="mt-2 text-xs text-peligro" role="alert">
        {{ error() }}
      </p>
    }`,
})
export class CampoFecha extends ControlCampo {}
