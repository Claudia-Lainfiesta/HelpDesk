import { ticketError } from './errors.js';
import type { PoolClient } from 'pg';
import type { UserProfile } from '../auth/types.js';
import type { TicketFilters, TicketPriority } from './validation.js';

const select = `SELECT t.id::text, t.reference AS number, t.subject, t.description, t.priority,
 s.code AS status, c.id::text AS category_id, c.name AS category_name,
 u.id::text AS requester_id, u.full_name AS requester_name, u.email AS requester_email,
 a.id::text AS agent_id, a.full_name AS agent_name, a.email AS agent_email,
 t.created_at, t.updated_at, t.resolved_at, t.closed_at, t.canceled_at,
 ta.id::text AS attachment_id,ta.original_filename AS attachment_name,ta.mime_type AS attachment_mime,ta.size_bytes AS attachment_size
 FROM tickets t JOIN ticket_statuses s ON s.id=t.status_id
 JOIN categories c ON c.id=t.category_id JOIN users u ON u.id=t.requester_id
 LEFT JOIN users a ON a.id=t.assigned_agent_id LEFT JOIN ticket_attachments ta ON ta.ticket_id=t.id`;
interface TicketRow {
  id: string;
  number: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketFilters['status'];
  category_id: string;
  category_name: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  agent_id: string | null;
  agent_name: string | null;
  agent_email: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  closed_at: Date | null;
  canceled_at: Date | null;
  attachment_id: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}
function view(row: TicketRow) {
  return {
    id: row.id,
    number: row.number,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    attachment: row.attachment_id
      ? {
          id: row.attachment_id,
          fileName: row.attachment_name!,
          mimeType: row.attachment_mime!,
          sizeBytes: row.attachment_size!,
        }
      : null,
    status: row.status!,
    category: { id: row.category_id, name: row.category_name },
    requester: { id: row.requester_id, fullName: row.requester_name, email: row.requester_email },
    assignedAgent: row.agent_id
      ? { id: row.agent_id, fullName: row.agent_name!, email: row.agent_email! }
      : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    canceledAt: row.canceled_at?.toISOString() ?? null,
  };
}
export async function findTicket(client: Pick<PoolClient, 'query'>, id: string, user: UserProfile) {
  const result = await client.query<TicketRow>(
    `${select} WHERE t.id=$1 ${user.role === 'solicitante' ? 'AND t.requester_id=$2' : ''}`,
    user.role === 'solicitante' ? [id, user.id] : [id],
  );
  if (!result.rows[0]) throw ticketError('TICKET_NOT_FOUND');
  return view(result.rows[0]);
}
export async function queryTickets(client: PoolClient, filters: TicketFilters, user: UserProfile) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const add = (condition: string, value: unknown) => {
    values.push(value);
    conditions.push(condition.replaceAll('?', `$${values.length}`));
  };
  if (user.role === 'solicitante') add('t.requester_id=?', user.id);
  if (filters.status) add('s.code=?', filters.status);
  if (filters.priority) add('t.priority=?', filters.priority);
  if (filters.categoryId) add('t.category_id=?', filters.categoryId);
  if (filters.search)
    add(
      '(t.reference ILIKE ? OR t.subject ILIKE ?)',
      `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`,
    );
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const count = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM tickets t JOIN ticket_statuses s ON s.id=t.status_id${where}`,
    values,
  );
  const result = await client.query<TicketRow>(
    `${select}${where} ORDER BY t.created_at DESC,t.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, filters.pageSize, (filters.page - 1) * filters.pageSize],
  );
  return {
    data: result.rows.map(view),
    page: filters.page,
    pageSize: filters.pageSize,
    total: Number(count.rows[0]!.total),
  };
}
