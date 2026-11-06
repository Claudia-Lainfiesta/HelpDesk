import { computed, Directive, input, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Directive()
export abstract class ControlCampo implements ControlValueAccessor {
  readonly identificador = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly ayuda = input('');
  readonly error = input('');
  readonly ocultarEtiqueta = input(false);
  readonly valor = signal('');
  readonly deshabilitado = signal(false);
  readonly descripcion = computed(() =>
    [
      this.ayuda() ? `${this.identificador()}-ayuda` : '',
      this.error() ? `${this.identificador()}-error` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
  private cambiar: (valor: string) => void = () => undefined;
  tocar: () => void = () => undefined;
  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }
  registerOnChange(fn: (valor: string) => void): void {
    this.cambiar = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.tocar = fn;
  }
  setDisabledState(valor: boolean): void {
    this.deshabilitado.set(valor);
  }
  escribir(evento: Event) {
    const valor = (evento.target as HTMLInputElement).value;
    this.valor.set(valor);
    this.cambiar(valor);
  }
}
