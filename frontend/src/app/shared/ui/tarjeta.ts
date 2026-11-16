import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'app-tarjeta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 rounded-tarjeta border border-linea bg-superficie shadow-tarjeta' },
  template: `<ng-content />`,
})
export class Tarjeta {}
