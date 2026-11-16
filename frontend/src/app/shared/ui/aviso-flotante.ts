import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Icono } from './icono';
@Injectable({ providedIn: 'root' })
export class Avisos implements OnDestroy {
  readonly aviso = signal<{ mensaje: string; error: boolean } | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;
  mostrar(mensaje: string, error = false) {
    clearTimeout(this.temporizador);
    this.aviso.set({ mensaje, error });
    this.temporizador = setTimeout(() => this.aviso.set(null), 6000);
  }
  cerrar() {
    clearTimeout(this.temporizador);
    this.aviso.set(null);
  }
  ngOnDestroy() {
    clearTimeout(this.temporizador);
  }
}
@Component({
  selector: 'app-aviso-flotante',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-96"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    @if (avisos.aviso(); as aviso) {
      <div
        class="flex items-start gap-3 rounded-tarjeta border border-linea bg-superficie p-4 shadow-tarjeta"
      >
        <app-icono
          class="mt-1"
          [class.text-peligro]="aviso.error"
          [class.text-exito]="!aviso.error"
          [nombre]="aviso.error ? 'alerta' : 'correcto'"
          [tamano]="22"
        />
        <div class="min-w-0 flex-1 py-1">
          <p class="font-semibold text-texto">
            {{ aviso.error ? 'Acción no completada' : 'Operación completada' }}
          </p>
          <p class="mt-1 break-words text-texto-suave">{{ aviso.mensaje }}</p>
        </div>
        <button
          type="button"
          class="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded-boton text-texto-suave hover:bg-fondo"
          aria-label="Cerrar notificación"
          title="Cerrar notificación"
          (click)="avisos.cerrar()"
        >
          <app-icono nombre="cerrar" />
        </button>
      </div>
    }
  </div>`,
})
export class AvisoFlotante {
  readonly avisos = inject(Avisos);
}
