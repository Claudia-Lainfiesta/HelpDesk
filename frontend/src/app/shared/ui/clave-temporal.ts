import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Modal } from './modal';
import { Boton } from './boton';
import { Alerta } from './alerta';
@Component({
  selector: 'app-clave-temporal',
  standalone: true,
  imports: [Modal, Boton, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-modal titulo="Contraseña temporal" [permiteCerrar]="false">
    <app-alerta variante="aviso"
      >Se muestra una sola vez. Entrégala al usuario por otro medio, no por correo. No podrás volver
      a consultarla.</app-alerta
    >
    <p class="mt-5 text-texto-suave">{{ nombre() }}</p>
    <p
      class="my-4 select-all break-all rounded-boton border border-linea bg-superficie-suave p-4 font-mono text-lg text-texto"
      aria-label="Contraseña temporal"
    >
      {{ clave }}
    </p>
    <app-boton variante="secundario" icono="copiar" (accion)="copiar()">Copiar</app-boton>
    <p class="mt-3 min-h-6 text-texto-suave" role="status" aria-live="polite">{{ mensaje() }}</p>
    <div class="mt-5 flex justify-end">
      <app-boton (accion)="terminar()">Ya la copié y entregué</app-boton>
    </div></app-modal
  >`,
})
export class ClaveTemporal implements OnDestroy {
  readonly nombre = input('');
  readonly cerrar = output<void>();
  private readonly documento = inject(DOCUMENT);
  private readonly cambios = inject(ChangeDetectorRef);
  // La clave se transfiere al diálogo mediante entregar; no se enlaza a estado compartido.
  clave = '';
  readonly mensaje = signal('');
  private destruido = false;
  entregar(clave: string) {
    this.clave = clave;
    this.cambios.markForCheck();
  }
  async copiar() {
    try {
      const clipboard = this.documento.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error();
      await clipboard.writeText(this.clave);
      if (!this.destruido)
        this.mensaje.set('Contraseña copiada. Entrégala al usuario por un medio seguro.');
    } catch {
      if (!this.destruido)
        this.mensaje.set('No se pudo copiar. Selecciona la contraseña y cópiala manualmente.');
    }
  }
  terminar() {
    this.clave = '';
    this.mensaje.set('');
    this.cerrar.emit();
  }
  ngOnDestroy() {
    this.destruido = true;
    this.clave = '';
    this.mensaje.set('');
  }
}
