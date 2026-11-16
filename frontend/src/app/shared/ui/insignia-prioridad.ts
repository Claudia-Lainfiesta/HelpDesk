import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TicketPriority, etiquetasPrioridad } from '../../core/tickets/prioridad';
const clases: Record<TicketPriority, string> = {
  baja: 'bg-info-suave text-info',
  media: 'bg-superficie-suave text-texto-suave border border-linea',
  alta: 'bg-aviso-suave text-aviso',
  urgente: 'bg-peligro-suave text-peligro',
};
@Component({
  selector: 'app-insignia-prioridad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="
      'inline-flex items-center whitespace-nowrap rounded-insignia px-2.5 py-1 text-xs font-semibold ' +
      clase()
    "
    >{{ etiqueta() }}</span
  >`,
})
export class InsigniaPrioridad {
  readonly prioridad = input.required<TicketPriority>();
  protected readonly clase = computed(() => clases[this.prioridad()]);
  protected readonly etiqueta = computed(() => etiquetasPrioridad[this.prioridad()]);
}
