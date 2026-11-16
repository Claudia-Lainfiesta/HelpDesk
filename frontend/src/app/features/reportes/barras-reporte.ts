import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
export interface BarraReporte {
  etiqueta: string;
  cantidad: number;
  clase: string;
}
@Component({
  selector: 'app-barras-reporte',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul class="space-y-4">
    @for (item of items(); track item.etiqueta) {
      <li>
        <div class="mb-1 flex justify-between gap-4">
          <span>{{ item.etiqueta }}</span
          ><strong class="shrink-0">{{ item.cantidad }}</strong>
        </div>
        <div class="h-2 overflow-hidden rounded-boton bg-fondo" aria-hidden="true">
          <div
            [class]="'h-full rounded-boton ' + item.clase"
            [style.width.%]="(item.cantidad / maximo()) * 100"
          ></div>
        </div>
      </li>
    }
  </ul>`,
})
export class BarrasReporte {
  readonly items = input.required<readonly BarraReporte[]>();
  protected readonly maximo = computed(() => Math.max(1, ...this.items().map((i) => i.cantidad)));
}
