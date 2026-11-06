import { ChangeDetectionStrategy, Component, input } from '@angular/core';
export type TipoInsigniaCuenta =
  'Temporal' | 'Vencida' | 'Inactiva' | 'Directorio' | 'Bloqueada' | 'Activa' | 'Rol';
@Component({
  selector: 'app-insignia-cuenta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="
      'inline-flex items-center rounded-insignia border px-2.5 py-1 text-xs font-semibold ' +
      clases[tipo()]
    "
    ><ng-content />{{ tipo() === 'Rol' ? '' : tipo() }}</span
  >`,
})
export class InsigniaCuenta {
  readonly tipo = input.required<TipoInsigniaCuenta>();
  readonly clases: Record<TipoInsigniaCuenta, string> = {
    Temporal: 'border-transparent bg-aviso-suave text-aviso',
    Vencida: 'border-transparent bg-peligro-suave text-peligro',
    Inactiva: 'border-transparent bg-estado-cerrado-suave text-estado-cerrado',
    Directorio: 'border-transparent bg-info-suave text-info',
    Bloqueada: 'border-transparent bg-peligro-suave text-peligro',
    Activa: 'border-transparent bg-exito-suave text-exito',
    Rol: 'border-linea bg-superficie-suave text-texto-suave',
  };
}
