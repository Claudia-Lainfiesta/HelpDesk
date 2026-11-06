import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EstadoTicket } from '../../shared/ui/insignia-estado';
import { AccionTicket } from './permisos-ticket';
import { Rol } from '../auth/modelos';
import { Pagina } from '../administracion/modelos';
export interface PersonaTicket {
  id: string;
  fullName: string;
  email: string;
}
export interface Ticket {
  id: string;
  number: string;
  subject: string;
  description: string;
  status: EstadoTicket;
  category: { id: string; name: string };
  requester: PersonaTicket;
  assignedAgent: PersonaTicket | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  canceledAt: string | null;
}
export interface CrearTicket {
  subject: string;
  description: string;
  categoryId: string;
}
export interface FiltrosTickets {
  page: number;
  pageSize: number;
  search?: string;
  status?: EstadoTicket;
  categoryId?: string;
}
export interface EventoTicket {
  id: string;
  type: 'created' | 'assigned' | 'reassigned' | 'unassigned' | 'status_changed';
  actor: { id: string; fullName: string; role: Rol };
  fromStatus: EstadoTicket | null;
  toStatus: EstadoTicket | null;
  fromAgent: { id: string; fullName: string } | null;
  toAgent: { id: string; fullName: string } | null;
  createdAt: string;
}
@Injectable({ providedIn: 'root' })
export class TicketsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tickets`;
  listar(filtros: FiltrosTickets) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtros))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<Pagina<Ticket>>(this.base, { params });
  }
  obtener(id: string) {
    return this.http.get<Ticket>(`${this.base}/${encodeURIComponent(id)}`);
  }
  agentesAsignables() {
    return this.http.get<PersonaTicket[]>(`${this.base}/assignable-agents`);
  }
  asignar(id: string, agentId: string | null) {
    return this.http.patch<Ticket>(`${this.base}/${encodeURIComponent(id)}/assignment`, {
      agentId,
    });
  }
  transicion(id: string, action: AccionTicket) {
    return this.http.post<Ticket>(`${this.base}/${encodeURIComponent(id)}/transitions`, { action });
  }
  eventos(id: string, page = 1, pageSize = 50) {
    return this.http.get<Pagina<EventoTicket>>(`${this.base}/${encodeURIComponent(id)}/events`, {
      params: { page, pageSize },
    });
  }
  crear(datos: CrearTicket) {
    return this.http.post<Ticket>(this.base, datos);
  }
}
