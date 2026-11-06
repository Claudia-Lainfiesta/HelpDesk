import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="fixed right-6 bottom-6 z-40 max-w-md"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    @if (avisos.aviso(); as aviso) {
      <div
        [class]="
          'rounded-tarjeta border p-4 shadow-tarjeta ' +
          (aviso.error
            ? 'border-peligro bg-peligro-suave text-peligro'
            : 'border-exito bg-exito-suave text-exito')
        "
      >
        <p>{{ aviso.mensaje }}</p>
        <button
          type="button"
          class="mt-2 rounded-boton text-sm underline"
          (click)="avisos.cerrar()"
        >
          Cerrar aviso
        </button>
      </div>
    }
  </div>`,
})
export class AvisoFlotante {
  readonly avisos = inject(Avisos);
}
