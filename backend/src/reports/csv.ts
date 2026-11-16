import type { ExportTicket, ReportFilters } from './types.js';
import type { TicketPriority, TicketStatus } from '../tickets/validation.js';

const statuses: Record<TicketStatus, string> = {
  creado: 'Creado',
  en_proceso: 'En proceso',
  en_espera: 'En espera',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};
const priorities: Record<TicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};
export const csvHeaders = [
  'Ticket',
  'Asunto',
  'Categoría',
  'Estado',
  'Prioridad',
  'Solicitante',
  'Agente asignado',
  'Fecha de creación',
  'Fecha de resolución',
  'Fecha de cierre',
  'Fecha de cancelación',
  'Tiempo de resolución',
  'Tiempo de cierre',
];

export function csvCell(value: string): string {
  // También protege fórmulas precedidas de espacios, controles o marcas invisibles.
  const safe = /^[\s\p{Cc}\p{Cf}]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function duration(minutes: number | null): string {
  if (minutes === null) return '';
  const total = Math.max(0, Math.round(minutes));
  const days = Math.floor(total / 1440),
    hours = Math.floor((total % 1440) / 60),
    rest = total % 60;
  return [days ? `${days} d` : '', hours ? `${hours} h` : '', rest || !total ? `${rest} min` : '']
    .filter(Boolean)
    .join(' ');
}
const timestamp = (date: Date | null) =>
  date ? `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC` : '';

export function ticketsCsv(tickets: readonly ExportTicket[]): string {
  const rows = tickets.map((t) => [
    t.number,
    t.subject,
    t.category,
    statuses[t.status],
    priorities[t.priority],
    t.requester,
    t.agent ?? '',
    timestamp(t.createdAt),
    timestamp(t.resolvedAt),
    timestamp(t.closedAt),
    timestamp(t.canceledAt),
    duration(t.resolutionMinutes),
    duration(t.closeMinutes),
  ]);
  // BOM para hojas de cálculo; CRLF y comillas en todas las celdas (RFC 4180).
  return (
    '\uFEFF' + [csvHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
  );
}
export function exportFilename(f: Pick<ReportFilters, 'from' | 'to' | 'timeZone'>): string {
  const day = (instant: string) => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: f.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(instant));
    return ['year', 'month', 'day']
      .map((kind) => parts.find((p) => p.type === kind)!.value)
      .join('-');
  };
  return `helpdesk-reporte-${day(f.from)}-a-${day(f.to)}.csv`;
}
