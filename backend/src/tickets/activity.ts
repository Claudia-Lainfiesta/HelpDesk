import type { PoolClient } from 'pg';
import type { TicketStatus, TicketPriority } from './validation.js';
import type { UserProfile, RoleCode } from '../auth/types.js';
import { transaction } from '../db/transaction.js';
import { findTicket } from './repository.js';
import { canReadNotes } from './policy.js';
export type EventType =
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'unassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'note_added';
export interface ActivityInput {
  ticketId: string;
  type: EventType;
  actorId: string;
  noteId?: string;
  fromPriority?: TicketPriority;
  toPriority?: TicketPriority;
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
  fromAgentId?: string | null;
  toAgentId?: string | null;
}
export async function recordActivity(client: PoolClient, event: ActivityInput) {
  await client.query(
    `INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,from_status,to_status,from_agent_user_id,to_agent_user_id,from_priority,to_priority,note_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      event.ticketId,
      event.type,
      event.actorId,
      event.fromStatus ?? null,
      event.toStatus ?? null,
      event.fromAgentId ?? null,
      event.toAgentId ?? null,
      event.fromPriority ?? null,
      event.toPriority ?? null,
      event.noteId ?? null,
    ],
  );
}
interface EventRow {
  id: string;
  type: EventType;
  from_priority: TicketPriority | null;
  to_priority: TicketPriority | null;
  from_status: TicketStatus | null;
  to_status: TicketStatus | null;
  created_at: Date;
  actor_id: string;
  actor_name: string;
  actor_role: RoleCode;
  from_id: string | null;
  from_name: string | null;
  to_id: string | null;
  to_name: string | null;
  note_id: string | null;
  note_body: string | null;
}
export function ticketEvents(id: string, user: UserProfile, page: number, pageSize: number) {
  return transaction(async (client) => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const ticket = await findTicket(client, id, user);
    const notesVisible = canReadNotes({ agentId: ticket.assignedAgent?.id ?? null }, user);
    const count = await client.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM ticket_events
       WHERE ticket_id=$1 AND ($2::boolean OR event_type<>'note_added')`,
      [id, notesVisible],
    );
    const result = await client.query<EventRow>(
      `SELECT e.id::text,e.event_type AS type,e.from_status,e.to_status,e.from_priority,e.to_priority,e.created_at,
      u.id::text AS actor_id,u.full_name AS actor_name,r.code AS actor_role,
      f.id::text AS from_id,f.full_name AS from_name,t.id::text AS to_id,t.full_name AS to_name,
      n.id::text AS note_id,n.body AS note_body
      FROM ticket_events e JOIN users u ON u.id=e.actor_user_id JOIN roles r ON r.id=u.role_id
      LEFT JOIN users f ON f.id=e.from_agent_user_id LEFT JOIN users t ON t.id=e.to_agent_user_id
      LEFT JOIN ticket_notes n ON n.id=e.note_id AND n.ticket_id=e.ticket_id AND $4::boolean
      WHERE e.ticket_id=$1 AND ($4::boolean OR e.event_type<>'note_added')
      ORDER BY e.created_at DESC,e.id DESC LIMIT $2 OFFSET $3`,
      [id, pageSize, (page - 1) * pageSize, notesVisible],
    );
    return {
      data: result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        actor: { id: row.actor_id, fullName: row.actor_name, role: row.actor_role },
        fromPriority: row.from_priority,
        toPriority: row.to_priority,
        ...(row.type === 'note_added' ? { note: { id: row.note_id!, body: row.note_body! } } : {}),
        fromStatus: row.from_status,
        toStatus: row.to_status,
        fromAgent: row.from_id ? { id: row.from_id, fullName: row.from_name } : null,
        toAgent: row.to_id ? { id: row.to_id, fullName: row.to_name } : null,
        createdAt: row.created_at.toISOString(),
      })),
      page,
      pageSize,
      total: Number(count.rows[0]!.total),
    };
  });
}
