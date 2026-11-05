import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
@Component({
  selector: 'app-filtro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    type="button"
    [attr.aria-pressed]="activo()"
    (click)="seleccionado.emit()"
    [class]="
      'min-h-9 whitespace-nowrap rounded-boton border px-4 py-2 font-medium ' +
      (activo()
        ? 'border-primario bg-primario text-sobre-primario'
        : 'border-linea bg-superficie text-texto-suave hover:bg-superficie-suave')
    "
  >
    <ng-content />
  </button>`,
})
export class Filtro {
  readonly activo = input(false);
  readonly seleccionado = output<void>();
}
