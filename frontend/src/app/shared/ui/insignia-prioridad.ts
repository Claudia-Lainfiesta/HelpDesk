import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TicketPriority, etiquetasPrioridad } from '../../core/tickets/prioridad';
const clases: Record<TicketPriority, string> = {
  baja: 'text-info',
  media: 'text-texto-suave',
  alta: 'text-aviso',
  urgente: 'text-peligro',
};
@Component({
  selector: 'app-insignia-prioridad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'inline-flex whitespace-nowrap text-sm font-semibold ' + clase()">{{
    etiqueta()
  }}</span>`,
})
export class InsigniaPrioridad {
  readonly prioridad = input.required<TicketPriority>();
  protected readonly clase = computed(() => clases[this.prioridad()]);
  protected readonly etiqueta = computed(() => etiquetasPrioridad[this.prioridad()]);
}
