import { ApiError } from '../auth/errors.js';
const definitions = {
  TICKET_NOT_FOUND: [404, 'No se encontró el ticket.'],
  TICKET_ACTION_FORBIDDEN: [403, 'No tienes permiso para realizar esta acción.'],
  TICKET_NOTE_FORBIDDEN: [403, 'No tienes permiso para agregar notas internas a este ticket.'],
  TICKET_NOTES_READ_ONLY: [409, 'Las notas de un ticket cerrado o cancelado son de solo lectura.'],
  TICKET_CONTACT_UNAVAILABLE: [
    409,
    'El contacto por Telegram no está disponible en tickets cerrados o cancelados.',
  ],
  TICKET_PRIORITY_UNCHANGED: [409, 'El ticket ya tiene esa prioridad.'],
  TICKET_PRIORITY_NOT_EDITABLE: [
    409,
    'La prioridad de un ticket cerrado o cancelado no puede modificarse.',
  ],
  TICKET_ASSIGNMENT_UNCHANGED: [409, 'El ticket ya tiene esa asignación.'],
  TICKET_ALREADY_ASSIGNED: [409, 'Este ticket ya fue asignado a otro agente.'],
  AGENT_NOT_ASSIGNABLE: [409, 'Selecciona un agente activo y no vencido.'],
  TICKET_AGENT_REQUIRED: [409, 'Asigna un agente antes de realizar esta acción.'],
  INVALID_TICKET_TRANSITION: [
    409,
    'El ticket cambió o la acción no corresponde a su estado actual.',
  ],
} as const;
export function ticketError(code: keyof typeof definitions) {
  const [status, message] = definitions[code];
  return new ApiError(status, code, message);
}
