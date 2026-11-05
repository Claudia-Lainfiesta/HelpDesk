import { Injectable } from '@angular/core';
import { EstadoTicket } from '../../shared/ui/insignia-estado';

export interface TicketEjemplo {
  referencia: string;
  asunto: string;
  categoria: string;
  estado: EstadoTicket;
  agente: string;
  fecha: string;
}
@Injectable({ providedIn: 'root' })
export class TicketsEjemploService {
  // TODO: reemplazar estos datos por la API de tickets del Sprint 2.
  readonly tickets: readonly TicketEjemplo[] = [
    {
      referencia: 'TK-000128',
      asunto: 'No puedo acceder a mi correo corporativo',
      categoria: 'Accesos y cuentas',
      estado: 'creado',
      agente: 'Sin asignar',
      fecha: 'Hoy 09:12',
    },
    {
      referencia: 'TK-000127',
      asunto: 'La impresora del piso 2 no imprime',
      categoria: 'Hardware',
      estado: 'en_proceso',
      agente: 'Marta Ruiz',
      fecha: 'Hoy 08:40',
    },
    {
      referencia: 'TK-000124',
      asunto: 'Instalar Office en equipo nuevo',
      categoria: 'Software',
      estado: 'en_espera',
      agente: 'Luis Pérez',
      fecha: 'Ayer',
    },
    {
      referencia: 'TK-000121',
      asunto: 'Internet lento en la sala de juntas',
      categoria: 'Redes e internet',
      estado: 'resuelto',
      agente: 'Marta Ruiz',
      fecha: '27 oct',
    },
    {
      referencia: 'TK-000119',
      asunto: 'Solicitud duplicada de acceso a la VPN',
      categoria: 'Accesos y cuentas',
      estado: 'cancelado',
      agente: 'Ana Soto',
      fecha: '26 oct',
    },
    {
      referencia: 'TK-000117',
      asunto: 'Cambio de monitor en recepción',
      categoria: 'Hardware',
      estado: 'cerrado',
      agente: 'Luis Pérez',
      fecha: '25 oct',
    },
  ];
}
