import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EstadoTicket } from '../../shared/ui/insignia-estado';
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
  crear(datos: CrearTicket) {
    return this.http.post<Ticket>(this.base, datos);
  }
}
