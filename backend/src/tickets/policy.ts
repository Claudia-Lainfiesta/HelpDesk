import { ticketError } from './errors.js';
import type { UserProfile } from '../auth/types.js';
import type { TicketStatus, TransitionAction } from './validation.js';
export interface CurrentTicket {
  id: string;
  status: TicketStatus;
  requesterId: string;
  agentId: string | null;
}
export const assignmentStates: readonly TicketStatus[] = ['creado', 'en_proceso', 'en_espera'];
export const transitions: Record<TransitionAction, Partial<Record<TicketStatus, TicketStatus>>> = {
  start: { creado: 'en_proceso' },
  wait: { en_proceso: 'en_espera' },
  resume: { en_espera: 'en_proceso' },
  resolve: { en_proceso: 'resuelto', en_espera: 'resuelto' },
  reopen: { resuelto: 'en_proceso' },
  close: { resuelto: 'cerrado' },
  cancel: { creado: 'cancelado', en_espera: 'cancelado' },
};
export const manages = (user: UserProfile) => ['supervisor', 'administrador'].includes(user.role);
export function canReadNotes(ticket: Pick<CurrentTicket, 'agentId'>, user: UserProfile) {
  return manages(user) || (user.role === 'agente' && ticket.agentId === user.id);
}
export function checkNoteCreation(ticket: CurrentTicket, user: UserProfile) {
  assertVisible(ticket, user);
  if (!canReadNotes(ticket, user)) throw ticketError('TICKET_NOTE_FORBIDDEN');
  if (ticket.status === 'cerrado' || ticket.status === 'cancelado')
    throw ticketError('TICKET_NOTES_READ_ONLY');
}
export function assertVisible(ticket: CurrentTicket, user: UserProfile) {
  if (user.role === 'solicitante' && ticket.requesterId !== user.id)
    throw ticketError('TICKET_NOT_FOUND');
}
export function forbid(): never {
  throw ticketError('TICKET_ACTION_FORBIDDEN');
}
export function checkAssignment(ticket: CurrentTicket, user: UserProfile, agentId: string | null) {
  assertVisible(ticket, user);
  if (!manages(user) && (user.role !== 'agente' || agentId !== user.id)) forbid();
  if (!assignmentStates.includes(ticket.status)) throw ticketError('INVALID_TICKET_TRANSITION');
  if (ticket.agentId === agentId) throw ticketError('TICKET_ASSIGNMENT_UNCHANGED');
  if (!manages(user) && ticket.agentId) throw ticketError('TICKET_ALREADY_ASSIGNED');
}
export function checkTransition(
  ticket: CurrentTicket,
  user: UserProfile,
  action: TransitionAction,
) {
  assertVisible(ticket, user);
  const ownerAction = ['reopen', 'close', 'cancel'].includes(action);
  if (
    !manages(user) &&
    !(ownerAction
      ? ticket.requesterId === user.id
      : user.role === 'agente' && ticket.agentId === user.id)
  )
    forbid();
  const target = transitions[action][ticket.status];
  if (!target) throw ticketError('INVALID_TICKET_TRANSITION');
  if (!ownerAction && !ticket.agentId) throw ticketError('TICKET_AGENT_REQUIRED');
  return target;
}

export function checkPriority(ticket: CurrentTicket, user: UserProfile) {
  assertVisible(ticket, user);
  if (!manages(user) && !(user.role === 'agente' && ticket.agentId === user.id)) forbid();
  if (ticket.status === 'cerrado' || ticket.status === 'cancelado')
    throw ticketError('TICKET_PRIORITY_NOT_EDITABLE');
}
