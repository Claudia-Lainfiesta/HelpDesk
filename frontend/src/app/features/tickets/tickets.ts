import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Filtro } from '../../shared/ui/filtro';
import { InsigniaEstado, estados, EstadoTicket } from '../../shared/ui/insignia-estado';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Alerta } from '../../shared/ui/alerta';
import { TicketsEjemploService } from './tickets-ejemplo.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [ReactiveFormsModule, Boton, CampoTexto, Filtro, InsigniaEstado, Tarjeta, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tickets.html',
})
export class Tickets {
  private readonly ejemplos = inject(TicketsEjemploService);
  protected readonly busqueda = new FormControl('', { nonNullable: true });
  private readonly texto = toSignal(this.busqueda.valueChanges, { initialValue: '' });
  protected readonly filtro = signal<EstadoTicket | 'todos'>('todos');
  protected readonly aviso = signal(false);
  protected readonly filtros = Object.entries(estados).map(([codigo, estado]) => ({
    codigo: codigo as EstadoTicket,
    etiqueta: estado.etiqueta,
  }));
  protected readonly visibles = computed(() => {
    const busqueda = this.texto().trim().toLocaleLowerCase('es');
    return this.ejemplos.tickets.filter(
      (ticket) =>
        (this.filtro() === 'todos' || ticket.estado === this.filtro()) &&
        `${ticket.referencia} ${ticket.asunto}`.toLocaleLowerCase('es').includes(busqueda),
    );
  });
}
