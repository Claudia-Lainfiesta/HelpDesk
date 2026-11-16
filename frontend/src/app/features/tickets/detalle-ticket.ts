import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { FechaLocal } from '../../core/administracion/fechas';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Alerta } from '../../shared/ui/alerta';
import { Boton } from '../../shared/ui/boton';
import { InsigniaEstado } from '../../shared/ui/insignia-estado';
import { InsigniaPrioridad } from '../../shared/ui/insignia-prioridad';
import { Selector } from '../../shared/ui/selector';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { Paginador } from '../../shared/ui/paginador';
import { AreaTexto } from '../../shared/ui/area-texto';
import { ImagenAdjunta } from './imagen-adjunta';
import { AvisoFlotante } from '../../shared/ui/aviso-flotante';
import { GestionTicket } from './gestion-ticket';
@Component({
  selector: 'app-detalle-ticket',
  standalone: true,
  imports: [
    RouterLink,
    FechaLocal,
    Tarjeta,
    Alerta,
    Boton,
    InsigniaEstado,
    InsigniaPrioridad,
    AvisoFlotante,
    ReactiveFormsModule,
    Selector,
    Confirmacion,
    Paginador,
    AreaTexto,
    ImagenAdjunta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-ticket.html',
})
export class DetalleTicket extends GestionTicket {}
