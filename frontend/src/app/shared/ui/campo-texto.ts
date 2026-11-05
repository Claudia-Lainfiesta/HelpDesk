import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icono, NombreIcono } from './icono';

@Component({
  selector: 'app-campo-texto',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoTexto), multi: true },
  ],
  template: `<label
      [for]="identificador()"
      [class]="ocultarEtiqueta() ? 'sr-only' : 'mb-2 block font-semibold text-texto-suave'"
      >{{ etiqueta() }}</label
    >
    <div class="relative">
      @if (icono(); as nombre) {
        <app-icono
          [nombre]="nombre"
          class="pointer-events-none absolute top-[13px] left-4 text-texto-suave"
        />
      }
      <input
        [id]="identificador()"
        [type]="tipo()"
        [value]="valor()"
        [disabled]="deshabilitado()"
        [autocomplete]="autocompletar()"
        [placeholder]="marcador()"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="descripcion() || null"
        (input)="escribir($event)"
        (blur)="tocar()"
        class="h-[46px] w-full rounded-boton border border-linea bg-superficie-suave pr-4 text-texto placeholder:text-texto-suave disabled:opacity-60"
        [class.pl-12]="!!icono()"
        [class.pl-4]="!icono()"
      />
    </div>
    @if (ayuda()) {
      <p [id]="identificador() + '-ayuda'" class="mt-2 text-xs text-texto-suave">{{ ayuda() }}</p>
    }
    @if (error()) {
      <p [id]="identificador() + '-error'" class="mt-2 text-xs text-peligro" role="alert">
        {{ error() }}
      </p>
    }`,
})
export class CampoTexto implements ControlValueAccessor {
  readonly identificador = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly tipo = input<'text' | 'email' | 'password' | 'search'>('text');
  readonly autocompletar = input('off');
  readonly marcador = input('');
  readonly ayuda = input('');
  readonly error = input('');
  readonly ocultarEtiqueta = input(false);
  readonly icono = input<NombreIcono>();
  protected readonly valor = signal('');
  protected readonly deshabilitado = signal(false);
  protected readonly descripcion = computed(() =>
    [
      this.ayuda() ? `${this.identificador()}-ayuda` : '',
      this.error() ? `${this.identificador()}-error` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
  private cambiar: (valor: string) => void = () => undefined;
  protected tocar: () => void = () => undefined;
  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }
  registerOnChange(cambiar: (valor: string) => void): void {
    this.cambiar = cambiar;
  }
  registerOnTouched(tocar: () => void): void {
    this.tocar = tocar;
  }
  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }
  protected escribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.valor.set(valor);
    this.cambiar(valor);
  }
}
