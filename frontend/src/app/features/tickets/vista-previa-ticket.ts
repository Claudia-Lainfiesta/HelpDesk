import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FechaLocal } from '../../core/administracion/fechas';
import { GestionTicket } from './gestion-ticket';
import { Boton } from '../../shared/ui/boton';
import { Alerta } from '../../shared/ui/alerta';
import { Selector } from '../../shared/ui/selector';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { InsigniaEstado } from '../../shared/ui/insignia-estado';
import { InsigniaPrioridad } from '../../shared/ui/insignia-prioridad';
import { Paginador } from '../../shared/ui/paginador';

@Component({
  selector: 'app-vista-previa-ticket',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FechaLocal,
    Boton,
    Alerta,
    Selector,
    Confirmacion,
    InsigniaEstado,
    InsigniaPrioridad,
    Paginador,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  templateUrl: './vista-previa-ticket.html',
})
export class VistaPreviaTicket extends GestionTicket {
  readonly bloque = signal<'detalles' | 'actividad'>('detalles');
}
