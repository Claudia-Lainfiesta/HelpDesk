import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'app-alerta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    [attr.role]="variante() === 'peligro' ? 'alert' : 'status'"
    [class]="
      'rounded-boton border border-current/20 px-4 py-3 leading-relaxed ' + clases[variante()]
    "
  >
    <ng-content />
  </div>`,
})
export class Alerta {
  readonly variante = input<'exito' | 'aviso' | 'peligro' | 'info'>('info');
  protected readonly clases = {
    exito: 'bg-exito-suave text-exito',
    aviso: 'bg-aviso-suave text-aviso',
    peligro: 'bg-peligro-suave text-peligro',
    info: 'bg-info-suave text-info',
  };
}
