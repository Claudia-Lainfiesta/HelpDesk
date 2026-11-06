import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Boton } from './boton';
let siguientePaginador = 0;
@Component({
  selector: 'app-paginador',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [Boton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav
    aria-label="Paginación"
    class="mt-5 flex flex-wrap items-center justify-between gap-4 text-texto-suave"
  >
    <p aria-live="polite">Mostrando {{ inicio() }}–{{ fin() }} de {{ total() }}</p>
    <div class="flex flex-wrap items-center gap-3">
      <label [for]="identificador">Por página</label
      ><select
        [id]="identificador"
        [value]="tamano()"
        [disabled]="cargando()"
        (change)="cambiarTamano($event)"
        class="h-9 rounded-boton border border-linea bg-superficie px-3 text-texto"
      >
        @for (valor of tamanos(); track valor) {
          <option [value]="valor" [selected]="valor === tamano()">{{ valor }}</option>
        }</select
      ><app-boton
        variante="secundario"
        tamano="sm"
        [deshabilitado]="pagina() <= 1 || cargando()"
        (accion)="cambiarPagina.emit(pagina() - 1)"
        >Anterior</app-boton
      ><app-boton
        variante="secundario"
        tamano="sm"
        [deshabilitado]="fin() >= total() || cargando()"
        (accion)="cambiarPagina.emit(pagina() + 1)"
        >Siguiente</app-boton
      >
    </div>
  </nav>`,
})
export class Paginador {
  readonly pagina = input(1);
  readonly tamano = input(20);
  readonly total = input(0);
  readonly cargando = input(false);
  readonly cambiarPagina = output<number>();
  readonly seleccionarTamano = output<number>();
  readonly identificador = `paginador-${++siguientePaginador}`;
  readonly tamanos = computed(() =>
    [...new Set([10, 20, 50, 100, this.tamano()])].sort((a, b) => a - b),
  );
  readonly inicio = computed(() =>
    this.total() === 0 ? 0 : (this.pagina() - 1) * this.tamano() + 1,
  );
  readonly fin = computed(() => Math.min(this.pagina() * this.tamano(), this.total()));
  cambiarTamano(evento: Event) {
    this.seleccionarTamano.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
