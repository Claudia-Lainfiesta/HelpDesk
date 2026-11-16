import { ticketError } from './errors.js';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import { ApiError, authenticationRequired } from '../auth/errors.js';
import type { UserProfile } from '../auth/types.js';
import { recordAudit } from '../audit/audit.js';
import { findTicket } from './repository.js';
import { recordActivity } from './activity.js';
import {
  assertVisible,
  checkAssignment,
  checkTransition,
  checkPriority,
  checkNoteCreation,
  type CurrentTicket,
} from './policy.js';
import type { TransitionAction, TicketPriority } from './validation.js';

export function telegramContact(id: string, user: UserProfile) {
  return transaction(async (client) => {
    const actor = await currentActor(client, user);
    const ticket = await lockedTicket(client, id, actor);
    if (ticket.requesterId !== actor.id || ticket.agentId === actor.id)
      throw ticketError('TICKET_ACTION_FORBIDDEN');
    if (ticket.status === 'cerrado' || ticket.status === 'cancelado')
      throw ticketError('TICKET_CONTACT_UNAVAILABLE');
    if (!ticket.agentId)
      return {
        available: false as const,
        message: 'Este ticket todavía no tiene un agente asignado.',
      };
    const agent = await client.query<{ telegram_username: string | null; available: boolean }>(
      `SELECT u.telegram_username, r.code='agente' AND u.is_active
         AND (u.expires_at IS NULL OR u.expires_at>clock_timestamp()) AS available
       FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 FOR SHARE OF u`,
      [ticket.agentId],
    );
    const row = agent.rows[0];
    if (!row?.available || !row.telegram_username)
      return {
        available: false as const,
        message: 'El agente asignado no tiene Telegram disponible.',
      };
    return { available: true as const, url: `https://t.me/${row.telegram_username}` };
  });
}

export function addTicketNote(id: string, body: string, user: UserProfile, ip?: string) {
  return transaction(async (client) => {
    const actor = await currentActor(client, user);
    const ticket = await lockedTicket(client, id, actor);
    checkNoteCreation(ticket, actor);
    const result = await client.query<{ id: string; body: string; created_at: Date }>(
      `INSERT INTO ticket_notes(ticket_id,author_user_id,body) VALUES($1,$2,$3)
       RETURNING id::text,body,created_at`,
      [id, actor.id, body],
    );
    const note = result.rows[0]!;
    await recordActivity(client, {
      ticketId: id,
      type: 'note_added',
      actorId: actor.id,
      noteId: note.id,
    });
    await recordAudit(client, {
      actor: { userId: actor.id, ...(ip ? { ip } : {}) },
      action: 'ticket.note_added',
      targetType: 'ticket',
      targetId: id,
      metadata: { noteId: note.id },
    });
    return {
      id: note.id,
      body: note.body,
      author: { id: actor.id, fullName: actor.fullName },
      createdAt: note.created_at.toISOString(),
    };
  });
}

async function lockedTicket(client: PoolClient, id: string, user: UserProfile) {
  // Bloquea solo la fila base: un JOIN al estado puede perder la fila al
  // reevaluarse después de esperar una actualización concurrente.
  const result = await client.query<
    Omit<CurrentTicket, 'status'> & { statusId: number; priority: TicketPriority }
  >(
    `SELECT id::text,priority,status_id AS "statusId",requester_id::text AS "requesterId",assigned_agent_id::text AS "agentId"
    FROM tickets WHERE id=$1 FOR UPDATE`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw ticketError('TICKET_NOT_FOUND');
  const status = await client.query<{ code: CurrentTicket['status'] }>(
    'SELECT code FROM ticket_statuses WHERE id=$1',
    [row.statusId],
  );
  const ticket: CurrentTicket = {
    id: row.id,
    requesterId: row.requesterId,
    agentId: row.agentId,
    status: status.rows[0]!.code,
  };
  assertVisible(ticket, user);
  return { ...ticket, priority: row.priority };
}
async function currentActor(client: PoolClient, user: UserProfile): Promise<UserProfile> {
  // Mantiene estable la autorización durante la operación frente a una baja/cambio de rol.
  const result = await client.query<{
    role: UserProfile['role'];
    valid: boolean;
    must_change_password: boolean;
  }>(
    `SELECT r.code AS role,u.is_active AND (u.expires_at IS NULL OR u.expires_at>clock_timestamp()) AS valid,u.must_change_password
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 FOR SHARE OF u`,
    [user.id],
  );
  const row = result.rows[0];
  if (!row?.valid) throw authenticationRequired();
  if (row.must_change_password)
    throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Debes cambiar tu contraseña.');
  return { ...user, role: row.role };
}
export async function assignableAgents() {
  const result = await pool.query<{
    id: string;
    fullName: string;
    email: string;
  }>(`SELECT u.id::text,u.full_name AS "fullName",u.email FROM users u JOIN roles r ON r.id=u.role_id
    WHERE r.code='agente' AND u.is_active AND (u.expires_at IS NULL OR u.expires_at>clock_timestamp()) ORDER BY u.full_name,u.id`);
  return result.rows;
}
export function changeAssignment(
  id: string,
  agentId: string | null,
  user: UserProfile,
  ip?: string,
) {
  return transaction(async (client) => {
    const actor = await currentActor(client, user);
    const ticket = await lockedTicket(client, id, actor);
    checkAssignment(ticket, actor, agentId);
    if (agentId) {
      const result = await client.query<{ valid: boolean }>(
        `SELECT r.code='agente' AND u.is_active AND (u.expires_at IS NULL OR u.expires_at>clock_timestamp()) AS valid
        FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 FOR SHARE OF u`,
        [agentId],
      );
      if (!result.rows[0]?.valid) throw ticketError('AGENT_NOT_ASSIGNABLE');
    }
    const type =
      agentId === null ? 'unassigned' : ticket.agentId === null ? 'assigned' : 'reassigned';
    await client.query('UPDATE tickets SET assigned_agent_id=$2 WHERE id=$1', [id, agentId]);
    await recordActivity(client, {
      ticketId: id,
      type,
      actorId: actor.id,
      fromAgentId: ticket.agentId,
      toAgentId: agentId,
    });
    await recordAudit(client, {
      actor: { userId: actor.id, ...(ip ? { ip } : {}) },
      action: `ticket.${type}`,
      targetType: 'ticket',
      targetId: id,
      metadata: { fromAgentId: ticket.agentId, toAgentId: agentId },
    });
    return findTicket(client, id, actor);
  });
}
export function transitionTicket(
  id: string,
  action: TransitionAction,
  user: UserProfile,
  ip?: string,
) {
  return transaction(async (client) => {
    const actor = await currentActor(client, user);
    const ticket = await lockedTicket(client, id, actor);
    const target = checkTransition(ticket, actor, action);
    await client.query(
      `UPDATE tickets SET status_id=(SELECT id FROM ticket_statuses WHERE code=$2),
      resolved_at=CASE WHEN $2='resuelto' THEN clock_timestamp() WHEN $3='reopen' THEN NULL ELSE resolved_at END,
      closed_at=CASE WHEN $2='cerrado' THEN clock_timestamp() ELSE closed_at END,
      canceled_at=CASE WHEN $2='cancelado' THEN clock_timestamp() ELSE canceled_at END WHERE id=$1`,
      [id, target, action],
    );
    await recordActivity(client, {
      ticketId: id,
      type: 'status_changed',
      actorId: actor.id,
      fromStatus: ticket.status,
      toStatus: target,
    });
    await recordAudit(client, {
      actor: { userId: actor.id, ...(ip ? { ip } : {}) },
      action: 'ticket.status_changed',
      targetType: 'ticket',
      targetId: id,
      metadata: { fromStatus: ticket.status, toStatus: target },
    });
    return findTicket(client, id, actor);
  });
}

export function changePriority(
  id: string,
  priority: TicketPriority,
  user: UserProfile,
  ip?: string,
) {
  return transaction(async (client) => {
    const actor = await currentActor(client, user);
    const ticket = await lockedTicket(client, id, actor);
    checkPriority(ticket, actor);
    if (ticket.priority === priority) throw ticketError('TICKET_PRIORITY_UNCHANGED');
    await client.query('UPDATE tickets SET priority=$2 WHERE id=$1', [id, priority]);
    await recordActivity(client, {
      ticketId: id,
      type: 'priority_changed',
      actorId: actor.id,
      fromPriority: ticket.priority,
      toPriority: priority,
    });
    await recordAudit(client, {
      actor: { userId: actor.id, ...(ip ? { ip } : {}) },
      action: 'ticket.priority_changed',
      targetType: 'ticket',
      targetId: id,
      metadata: { fromPriority: ticket.priority, toPriority: priority },
    });
    return findTicket(client, id, actor);
  });
}
