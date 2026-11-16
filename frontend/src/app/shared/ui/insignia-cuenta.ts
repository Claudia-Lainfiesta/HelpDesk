import { ChangeDetectionStrategy, Component, input } from '@angular/core';
export type TipoInsigniaCuenta =
  'Temporal' | 'Vencida' | 'Inactiva' | 'Bloqueada' | 'Activa' | 'Rol';
@Component({
  selector: 'app-insignia-cuenta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'inline-flex text-sm font-semibold ' + clases[tipo()]"
    ><ng-content />{{ tipo() === 'Rol' ? '' : tipo() }}</span
  >`,
})
export class InsigniaCuenta {
  readonly tipo = input.required<TipoInsigniaCuenta>();
  readonly clases: Record<TipoInsigniaCuenta, string> = {
    Temporal: 'text-aviso',
    Vencida: 'text-peligro',
    Inactiva: 'text-estado-cerrado',
    Bloqueada: 'text-peligro',
    Activa: 'text-exito',
    Rol: 'text-texto-suave',
  };
}
