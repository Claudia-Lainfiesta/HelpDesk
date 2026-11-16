import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EstadoTicket } from '../../shared/ui/insignia-estado';
import { TicketPriority } from './prioridad';
export type { TicketPriority } from './prioridad';
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
  priority: TicketPriority;
  attachment: {
    id: string;
    fileName: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
  } | null;
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
  priority?: TicketPriority;
  categoryId?: string;
}
export interface EventoTicket {
  id: string;
  type:
    | 'created'
    | 'assigned'
    | 'reassigned'
    | 'unassigned'
    | 'status_changed'
    | 'priority_changed'
    | 'note_added';
  note?: { id: string; body: string };
  actor: { id: string; fullName: string; role: Rol };
  fromPriority: TicketPriority | null;
  toPriority: TicketPriority | null;
  fromStatus: EstadoTicket | null;
  toStatus: EstadoTicket | null;
  fromAgent: { id: string; fullName: string } | null;
  toAgent: { id: string; fullName: string } | null;
  createdAt: string;
}
export interface NotaTicket {
  id: string;
  body: string;
  author: { id: string; fullName: string };
  createdAt: string;
}
export type ContactoTelegram =
  { available: true; url: string } | { available: false; message: string };
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
  cambiarPrioridad(id: string, priority: TicketPriority) {
    return this.http.patch<Ticket>(`${this.base}/${encodeURIComponent(id)}/priority`, { priority });
  }
  transicion(id: string, action: AccionTicket) {
    return this.http.post<Ticket>(`${this.base}/${encodeURIComponent(id)}/transitions`, { action });
  }
  eventos(id: string, page = 1, pageSize = 50) {
    return this.http.get<Pagina<EventoTicket>>(`${this.base}/${encodeURIComponent(id)}/events`, {
      params: { page, pageSize },
    });
  }
  crear(datos: CrearTicket, imagen?: File) {
    const body = new FormData();
    body.set('subject', datos.subject);
    body.set('description', datos.description);
    body.set('categoryId', datos.categoryId);
    if (imagen) body.set('image', imagen);
    return this.http.post<Ticket>(this.base, body);
  }
  imagen(id: string) {
    return this.http.get(`${this.base}/${encodeURIComponent(id)}/attachment`, {
      responseType: 'blob',
    });
  }
  agregarNota(id: string, body: string) {
    return this.http.post<NotaTicket>(`${this.base}/${encodeURIComponent(id)}/notes`, { body });
  }
  contactoTelegram(id: string) {
    return this.http.get<ContactoTelegram>(
      `${this.base}/${encodeURIComponent(id)}/telegram-contact`,
    );
  }
}
