import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'app-interruptor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Interruptor), multi: true },
  ],
  template: `<label
    class="inline-flex cursor-pointer items-center gap-3 text-texto"
    [for]="identificador()"
  >
    <input
      [id]="identificador()"
      type="checkbox"
      role="switch"
      [checked]="valor()"
      [attr.aria-checked]="valor()"
      [disabled]="deshabilitado()"
      (change)="alternar($event)"
      (blur)="tocar()"
      class="h-5 w-5 rounded-boton accent-primario"
    />
    <span>{{ etiqueta() }}</span></label
  >`,
})
export class Interruptor implements ControlValueAccessor {
  readonly identificador = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly valor = signal(false);
  readonly deshabilitado = signal(false);
  private cambiar: (valor: boolean) => void = () => undefined;
  tocar: () => void = () => undefined;
  writeValue(valor: boolean): void {
    this.valor.set(!!valor);
  }
  registerOnChange(fn: (valor: boolean) => void): void {
    this.cambiar = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.tocar = fn;
  }
  setDisabledState(valor: boolean): void {
    this.deshabilitado.set(valor);
  }
  alternar(evento: Event) {
    const valor = (evento.target as HTMLInputElement).checked;
    this.valor.set(valor);
    this.cambiar(valor);
  }
}
