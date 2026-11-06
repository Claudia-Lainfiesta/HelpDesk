import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icono } from './icono';

let siguienteModal = 0;
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="fixed inset-0 z-50 flex items-center justify-center bg-primario/40 p-4">
    <section
      #dialogo
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="tituloId"
      tabindex="-1"
      class="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-tarjeta border border-linea bg-superficie shadow-tarjeta"
    >
      <header class="flex items-start justify-between gap-4 border-b border-linea px-6 py-5">
        <h2 [id]="tituloId" class="text-xl font-bold text-primario">{{ titulo() }}</h2>
        @if (permiteCerrar()) {
          <button
            type="button"
            (click)="pedirCerrar()"
            [disabled]="ocupado()"
            aria-label="Cerrar diálogo"
            class="rounded-boton p-1 text-texto-suave hover:bg-fondo disabled:opacity-60"
          >
            <app-icono nombre="cerrar" />
          </button>
        }
      </header>
      <div class="p-6"><ng-content /></div>
    </section>
  </div>`,
})
export class Modal implements AfterViewInit, OnDestroy {
  readonly titulo = input.required<string>();
  readonly permiteCerrar = input(true);
  readonly ocupado = input(false);
  readonly cerrar = output<void>();
  readonly tituloId = `dialogo-${++siguienteModal}`;
  private readonly documento = inject(DOCUMENT);
  private readonly dialogo = viewChild.required<ElementRef<HTMLElement>>('dialogo');
  private readonly previo = this.documento.activeElement as HTMLElement | null;
  private readonly desplazamiento = this.documento.body.style.overflow;
  private destruido = false;
  private elementos() {
    return Array.from(
      this.dialogo().nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ).filter((e) => !e.hidden && e.getAttribute('aria-hidden') !== 'true');
  }
  private readonly teclado = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      this.pedirCerrar();
    }
    if (evento.key !== 'Tab') return;
    const elementos = this.elementos();
    const indice = elementos.indexOf(this.documento.activeElement as HTMLElement);
    if (!elementos.length) {
      evento.preventDefault();
      this.dialogo().nativeElement.focus();
    } else if (evento.shiftKey && indice <= 0) {
      evento.preventDefault();
      elementos.at(-1)!.focus();
    } else if (!evento.shiftKey && (indice < 0 || indice === elementos.length - 1)) {
      evento.preventDefault();
      elementos[0].focus();
    }
  };
  private readonly mantenerFoco = (evento: FocusEvent) => {
    if (!this.dialogo().nativeElement.contains(evento.target as Node))
      (this.elementos()[0] ?? this.dialogo().nativeElement).focus();
  };
  ngAfterViewInit() {
    this.documento.body.style.overflow = 'hidden';
    this.documento.addEventListener('keydown', this.teclado, true);
    this.documento.addEventListener('focusin', this.mantenerFoco);
    queueMicrotask(() => {
      if (!this.destruido) (this.elementos()[0] ?? this.dialogo().nativeElement).focus();
    });
  }
  pedirCerrar() {
    if (this.permiteCerrar() && !this.ocupado()) this.cerrar.emit();
  }
  ngOnDestroy() {
    this.destruido = true;
    this.documento.removeEventListener('keydown', this.teclado, true);
    this.documento.removeEventListener('focusin', this.mantenerFoco);
    this.documento.body.style.overflow = this.desplazamiento;
    if (this.previo?.isConnected) this.previo.focus();
  }
}
