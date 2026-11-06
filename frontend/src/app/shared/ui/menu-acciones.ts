import {
  afterNextRender,
  Injector,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icono } from './icono';
export interface AccionFila {
  codigo: string;
  etiqueta: string;
  deshabilitada?: boolean;
  explicacion?: string;
  peligro?: boolean;
}
let siguienteMenu = 0;
@Component({
  selector: 'app-menu-acciones',
  standalone: true,
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'fuera($event)',
    '(window:resize)': 'cerrar()',
    '(window:scroll)': 'cerrar()',
  },
  template: `<button
      #boton
      type="button"
      class="relative inline-flex items-center gap-2 rounded-boton border border-linea bg-superficie px-3 py-2 text-texto-suave hover:bg-fondo"
      aria-haspopup="menu"
      [attr.aria-expanded]="abierto()"
      [attr.aria-controls]="abierto() ? identificador : null"
      [attr.aria-label]="'Acciones de ' + nombre()"
      (click)="alternar()"
      (keydown)="tecladoBoton($event)"
    >
      <app-icono nombre="acciones" /><span class="sr-only">Acciones</span>
    </button>
    @if (abierto()) {
      <div
        #menu
        [id]="identificador"
        role="menu"
        tabindex="-1"
        [attr.aria-label]="'Acciones de ' + nombre()"
        class="fixed z-40 w-72 rounded-tarjeta border border-linea bg-superficie p-2 shadow-tarjeta"
        [style.top.px]="posicion().arriba"
        [style.left.px]="posicion().izquierda"
        (keydown)="teclado($event)"
      >
        @for (accion of acciones(); track accion.codigo; let indice = $index) {
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            [disabled]="accion.deshabilitada"
            [title]="accion.explicacion || ''"
            [attr.aria-describedby]="accion.explicacion ? identificador + '-' + indice : null"
            [class]="
              'block w-full rounded-boton px-3 py-2 text-left hover:bg-fondo disabled:cursor-not-allowed disabled:opacity-60 ' +
              (accion.peligro ? 'text-peligro' : 'text-texto')
            "
            (click)="elegir(accion)"
          >
            {{ accion.etiqueta }}
          </button>
          @if (accion.explicacion) {
            <p [id]="identificador + '-' + indice" class="px-3 pb-2 text-xs text-texto-suave">
              {{ accion.explicacion }}
            </p>
          }
        }
      </div>
    }`,
})
export class MenuAcciones {
  readonly acciones = input.required<readonly AccionFila[]>();
  readonly nombre = input.required<string>();
  readonly seleccionado = output<string>();
  readonly abierto = signal(false);
  readonly posicion = signal({ arriba: 0, izquierda: 0 });
  readonly identificador = `acciones-${++siguienteMenu}`;
  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly inyector = inject(Injector);
  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  alternar(ultimo = false) {
    if (this.abierto()) {
      this.cerrar();
      return;
    }
    const rect = this.boton().nativeElement.getBoundingClientRect();
    const altura = this.acciones().reduce((total, a) => total + (a.explicacion ? 90 : 40), 16);
    this.posicion.set({
      arriba: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - altura - 8)),
      izquierda: Math.max(8, Math.min(rect.right - 288, window.innerWidth - 296)),
    });
    this.abierto.set(true);
    afterNextRender(
      () => {
        if (!this.abierto()) return;
        const botones = this.botones();
        (ultimo ? botones.at(-1) : botones[0])?.focus();
      },
      { injector: this.inyector },
    );
  }
  private botones() {
    return Array.from(
      this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
  }
  cerrar(retornar = false) {
    this.abierto.set(false);
    if (retornar) this.boton().nativeElement.focus();
  }
  fuera(evento: Event) {
    if (!this.elemento.nativeElement.contains(evento.target as Node)) this.cerrar();
  }
  tecladoBoton(evento: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp'].includes(evento.key)) {
      evento.preventDefault();
      if (!this.abierto()) this.alternar(evento.key === 'ArrowUp');
    }
  }
  teclado(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      this.cerrar(true);
      return;
    }
    if (evento.key === 'Tab') {
      this.cerrar(true);
      return;
    }
    const botones = this.botones();
    const indice = botones.indexOf(document.activeElement as HTMLButtonElement);
    let siguiente: number;
    if (evento.key === 'ArrowDown') siguiente = (indice + 1) % botones.length;
    else if (evento.key === 'ArrowUp') siguiente = (indice - 1 + botones.length) % botones.length;
    else if (evento.key === 'Home') siguiente = 0;
    else if (evento.key === 'End') siguiente = botones.length - 1;
    else return;
    evento.preventDefault();
    botones[siguiente]?.focus();
  }
  elegir(accion: AccionFila) {
    if (!accion.deshabilitada) {
      this.cerrar(true);
      this.seleccionado.emit(accion.codigo);
    }
  }
}
