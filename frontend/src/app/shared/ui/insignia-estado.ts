import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const estados = {
  creado: { etiqueta: 'Creado', clases: 'text-estado-creado' },
  en_proceso: {
    etiqueta: 'En proceso',
    clases: 'text-estado-en-proceso',
  },
  en_espera: { etiqueta: 'En espera', clases: 'text-estado-en-espera' },
  resuelto: { etiqueta: 'Resuelto', clases: 'text-estado-resuelto' },
  cerrado: { etiqueta: 'Cerrado', clases: 'text-estado-cerrado' },
  cancelado: { etiqueta: 'Cancelado', clases: 'text-estado-cancelado' },
} as const;
export type EstadoTicket = keyof typeof estados;
@Component({
  selector: 'app-insignia-estado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="'inline-flex whitespace-nowrap text-sm font-semibold ' + estado().clases"
    >{{ estado().etiqueta }}</span
  >`,
})
export class InsigniaEstado {
  readonly codigo = input.required<EstadoTicket>();
  protected readonly estado = computed(() => estados[this.codigo()]);
}
