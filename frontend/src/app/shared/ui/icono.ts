import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const trazos = {
  ticket: ['M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z', 'M16 7v2m0 3v1m0 3v1'],
  etiqueta: ['M3 3h8l10 10-8 8L3 11Z', 'M7 7h.01'],
  usuarios: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M17 4a4 4 0 0 1 0 7m5 10v-2a4 4 0 0 0-3-4',
  ],
  reporte: ['M3 3v18h18', 'M7 17v-6m5 6V5m5 12v-8'],
  buscar: ['M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14', 'm15 15 6 6'],
  mas: ['M12 5v14M5 12h14'],
  correo: ['M3 5h18v14H3Z', 'm3 6 9 7 9-7'],
  candado: ['M5 10h14v11H5Z', 'M8 10V7a4 4 0 0 1 8 0v3'],
  salir: ['M9 3H4v18h5', 'M9 12h12m-4-4 4 4-4 4'],
  llave: ['M8 14a5 5 0 1 1 5-5l8 0v4h-3v3h-4v-3Z'],
  desplegar: ['m6 9 6 6 6-6'],
  cerrar: ['M6 6l12 12M6 18 18 6'],
  copiar: ['M9 9h12v12H9Z', 'M15 9V3H3v12h6'],
  acciones: ['M5 12h.01M12 12h.01M19 12h.01'],
  editar: ['m16 3 5 5L9 20l-6 1 1-6Z', 'm14 5 5 5'],
  menu: ['M3 6h18M3 12h18M3 18h18'],
} as const;
export type NombreIcono = keyof typeof trazos;

@Component({
  selector: 'app-icono',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 align-middle' },
  template: `<svg
    [attr.width]="tamano()"
    [attr.height]="tamano()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    [attr.aria-hidden]="etiqueta() ? null : 'true'"
    [attr.aria-label]="etiqueta() || null"
    [attr.role]="etiqueta() ? 'img' : null"
  >
    @for (trazo of caminos(); track $index) {
      <path [attr.d]="trazo" />
    }
  </svg>`,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
  readonly etiqueta = input('');
  protected caminos() {
    return trazos[this.nombre()];
  }
}
