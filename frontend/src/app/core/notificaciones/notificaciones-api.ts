import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export type TipoNotificacion =
  | 'ticket_assigned'
  | 'ticket_reassigned'
  | 'ticket_started'
  | 'ticket_waiting'
  | 'ticket_resolved'
  | 'ticket_reopened'
  | 'ticket_closed'
  | 'priority_changed';
export interface Notificacion {
  id: string;
  type: TipoNotificacion;
  title: string;
  message: string;
  ticketId: string | null;
  ticketNumber: string | null;
  readAt: string | null;
  createdAt: string;
}
export interface PaginaNotificaciones {
  items: Notificacion[];
  pagination: { page: number; pageSize: number; total: number };
}
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;
  contador() {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }
  listar(page = 1, pageSize = 20, unreadOnly = false) {
    return this.http.get<PaginaNotificaciones>(this.base, {
      params: { page, pageSize, unreadOnly },
    });
  }
  leer(id: string) {
    return this.http.patch<void>(`${this.base}/${encodeURIComponent(id)}/read`, {});
  }
  leerTodas() {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
