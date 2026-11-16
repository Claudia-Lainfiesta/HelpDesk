import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TicketsApi } from '../../core/tickets/tickets-api';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Alerta } from '../../shared/ui/alerta';
import { Boton } from '../../shared/ui/boton';

@Component({
  selector: 'app-imagen-adjunta',
  standalone: true,
  imports: [Tarjeta, Alerta, Boton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-tarjeta class="mt-6 block"
    ><section class="space-y-4 p-5 sm:p-7" aria-label="Imagen adjunta">
      <h2 class="text-xl font-bold text-primario">Imagen adjunta</h2>
      @if (cargando()) {
        <p role="status">Cargando imagen…</p>
      }
      @if (error()) {
        <app-alerta variante="aviso">No fue posible cargar la imagen adjunta.</app-alerta
        ><app-boton variante="secundario" (accion)="cargar()">Reintentar imagen</app-boton>
      }
      @if (url(); as imagen) {
        <a
          [href]="imagen"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver imagen adjunta en tamaño completo"
          title="Ver imagen adjunta en tamaño completo"
          class="inline-block max-w-full cursor-zoom-in rounded-tarjeta hover:opacity-90"
          ><img
            [src]="imagen"
            [alt]="'Imagen adjunta al ticket ' + numero()"
            (error)="fallar()"
            class="max-h-96 max-w-full rounded-tarjeta border border-linea object-contain"
        /></a>
      }</section
  ></app-tarjeta>`,
})
export class ImagenAdjunta implements OnInit {
  readonly ticketId = input.required<string>();
  readonly numero = input.required<string>();
  readonly url = signal('');
  readonly cargando = signal(false);
  readonly error = signal(false);
  private readonly api = inject(TicketsApi);
  private readonly destruir = inject(DestroyRef);
  constructor() {
    this.destruir.onDestroy(() => this.liberar());
  }
  ngOnInit() {
    this.cargar();
  }
  private liberar() {
    if (this.url()) URL.revokeObjectURL(this.url());
    this.url.set('');
  }
  fallar() {
    this.liberar();
    this.error.set(true);
    this.cargando.set(false);
  }
  cargar() {
    if (this.cargando()) return;
    this.liberar();
    this.cargando.set(true);
    this.error.set(false);
    this.api
      .imagen(this.ticketId())
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (blob) => {
          this.url.set(URL.createObjectURL(blob));
          this.cargando.set(false);
        },
        error: () => this.fallar(),
      });
  }
}
