import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const estados = {
  creado: { etiqueta: 'Creado', clases: 'bg-estado-creado-suave text-estado-creado' },
  en_proceso: {
    etiqueta: 'En proceso',
    clases: 'bg-estado-en-proceso-suave text-estado-en-proceso',
  },
  en_espera: { etiqueta: 'En espera', clases: 'bg-estado-en-espera-suave text-estado-en-espera' },
  resuelto: { etiqueta: 'Resuelto', clases: 'bg-estado-resuelto-suave text-estado-resuelto' },
  cerrado: { etiqueta: 'Cerrado', clases: 'bg-estado-cerrado-suave text-estado-cerrado' },
  cancelado: { etiqueta: 'Cancelado', clases: 'bg-estado-cancelado-suave text-estado-cancelado' },
} as const;
export type EstadoTicket = keyof typeof estados;
@Component({
  selector: 'app-insignia-estado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-insignia px-2.5 py-1 text-xs font-semibold ' +
      estado().clases
    "
    ><span class="h-1.5 w-1.5 rounded-insignia bg-current" aria-hidden="true"></span
    >{{ estado().etiqueta }}</span
  >`,
})
export class InsigniaEstado {
  readonly codigo = input.required<EstadoTicket>();
  protected readonly estado = computed(() => estados[this.codigo()]);
}
