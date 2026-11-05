import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icono } from './icono';
@Component({
  selector: 'app-marca',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex items-center gap-3 text-[22px] font-bold tracking-tight text-primario"
    ><span
      class="inline-flex h-10 w-10 items-center justify-center rounded-boton bg-primario text-sobre-primario"
      ><app-icono nombre="ticket" [tamano]="23" /></span
    >HelpDesk</span
  >`,
})
export class Marca {}
