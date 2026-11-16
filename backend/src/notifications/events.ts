import type { PoolClient } from 'pg';
import type { NotificationType } from './types.js';
const text: Record<NotificationType, { title: string; message: (number: string) => string }> = {
  ticket_assigned: {
    title: 'Nuevo ticket asignado',
    message: (n) => `Te asignaron el ticket ${n}.`,
  },
  ticket_reassigned: {
    title: 'Ticket reasignado',
    message: (n) => `Te reasignaron el ticket ${n}.`,
  },
  ticket_started: {
    title: 'Tu ticket está siendo atendido',
    message: (n) => `Tu ticket ${n} ahora está en proceso.`,
  },
  ticket_waiting: {
    title: 'Ticket en espera',
    message: (n) => `Tu ticket ${n} fue puesto en espera.`,
  },
  ticket_resolved: {
    title: 'Ticket resuelto',
    message: (n) =>
      `Tu ticket ${n} fue marcado como resuelto. Puedes cerrarlo o indicar que el problema continúa.`,
  },
  ticket_reopened: { title: 'Ticket reabierto', message: (n) => `El ticket ${n} fue reabierto.` },
  ticket_closed: { title: 'Ticket cerrado', message: (n) => `El ticket ${n} fue cerrado.` },
  priority_changed: {
    title: 'Prioridad urgente',
    message: (n) => `El ticket ${n} ahora tiene prioridad Urgente.`,
  },
};
export async function notifyUser(
  db: PoolClient,
  event: {
    type: NotificationType;
    recipientId: string | null;
    actorId: string;
    ticketId: string;
    number: string;
  },
) {
  if (!event.recipientId || event.recipientId === event.actorId) return;
  const template = text[event.type];
  await db.query(
    'INSERT INTO notifications(user_id,type,title,message,ticket_id) VALUES($1,$2,$3,$4,$5)',
    [event.recipientId, event.type, template.title, template.message(event.number), event.ticketId],
  );
}
