import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import { ApiError } from '../auth/errors.js';
import type { UserProfile } from '../auth/types.js';
import { recordAudit } from '../audit/audit.js';
import { findTicket, queryTickets } from './repository.js';
import type { CreateTicketInput, TicketFilters } from './validation.js';

export const getTicket = (id: string, user: UserProfile) => findTicket(pool, id, user);
export function listTickets(filters: TicketFilters, user: UserProfile) {
  return transaction(async (client) => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    return queryTickets(client, filters, user);
  });
}
export function createTicket(input: CreateTicketInput, user: UserProfile, ip?: string) {
  return transaction(async (client) => {
    // Comparte lock con cambios de categoría: no puede desactivarse durante el alta.
    const category = await client.query<{ is_active: boolean }>(
      'SELECT is_active FROM categories WHERE id=$1 FOR SHARE',
      [input.categoryId],
    );
    if (!category.rows[0])
      throw new ApiError(400, 'INVALID_CATEGORY', 'Selecciona una categoría válida.');
    if (!category.rows[0].is_active)
      throw new ApiError(
        409,
        'CATEGORY_INACTIVE',
        'La categoría seleccionada ya no está disponible. Elige otra categoría.',
      );
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO tickets(subject,description,category_id,requester_id,status_id,assigned_agent_id)
  VALUES($1,$2,$3,$4,(SELECT id FROM ticket_statuses WHERE code='creado'),NULL) RETURNING id::text`,
      [input.subject, input.description, input.categoryId, user.id],
    );
    const ticket = await findTicket(client, inserted.rows[0]!.id, user);
    await recordAudit(client, {
      actor: { userId: user.id, ...(ip ? { ip } : {}) },
      action: 'ticket.created',
      targetType: 'ticket',
      targetId: ticket.id,
      metadata: { ticketNumber: ticket.number, categoryId: ticket.category.id },
    });
    return ticket;
  });
}
