import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icono, NombreIcono } from './icono';

@Component({
  selector: 'app-boton',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', '[class.w-full]': 'anchoCompleto()' },
  template: `<button
    [type]="tipo()"
    [disabled]="deshabilitado() || cargando()"
    [attr.aria-busy]="cargando()"
    [class]="clases()"
    (click)="accion.emit()"
  >
    @if (cargando()) {
      <span
        class="h-4 w-4 animate-spin rounded-boton border-2 border-current border-t-transparent motion-reduce:animate-none"
        aria-hidden="true"
      ></span
      ><span class="sr-only">Procesando. </span>
    } @else if (icono(); as nombre) {
      <app-icono [nombre]="nombre" [tamano]="18" />
    }
    <ng-content />
  </button>`,
})
export class Boton {
  readonly variante = input<'primario' | 'secundario' | 'peligro' | 'fantasma'>('primario');
  readonly tamano = input<'md' | 'sm'>('md');
  readonly tipo = input<'button' | 'submit' | 'reset'>('button');
  readonly cargando = input(false);
  readonly deshabilitado = input(false);
  readonly anchoCompleto = input(false);
  readonly icono = input<NombreIcono>();
  readonly accion = output<void>();
  private readonly variantes = {
    primario: 'border-primario bg-primario text-sobre-primario hover:bg-primario-hover',
    secundario: 'border-linea bg-superficie text-texto hover:bg-fondo',
    peligro: 'border-peligro bg-peligro text-sobre-primario hover:opacity-90',
    fantasma:
      'border-transparent bg-transparent text-texto-suave hover:bg-fondo hover:text-primario',
  };
  protected readonly clases = computed(
    () =>
      `inline-flex w-full items-center justify-center gap-2 rounded-boton border font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${this.tamano() === 'md' ? 'min-h-[46px] px-5 py-2.5' : 'min-h-9 px-3 py-1.5'} ${this.variantes[this.variante()]}`,
  );
}
