import { z } from 'zod';
import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import { queryBoolean } from '../http/validation.js';
import { ApiError } from '../auth/errors.js';
import type { Notification } from './types.js';
export const filtersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: queryBoolean.default(false),
  })
  .strict();
export const emptySchema = z.object({}).strict();
export async function unreadCount(userId: string) {
  return (
    await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL',
      [userId],
    )
  ).rows[0]!;
}
export async function listNotifications(userId: string, filters: z.infer<typeof filtersSchema>) {
  return transaction(async (db) => {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const values = [userId, filters.unreadOnly];
    const where = 'n.user_id=$1 AND (NOT $2::boolean OR n.read_at IS NULL)';
    const total = (
      await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM notifications n WHERE ${where}`,
        values,
      )
    ).rows[0]!.count;
    const rows = await db.query<Notification>(
      `SELECT n.id::text,n.type,n.title,n.message,n.ticket_id::text AS "ticketId",t.reference AS "ticketNumber",
      to_char(n.read_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "readAt",
      to_char(n.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
      FROM notifications n LEFT JOIN tickets t ON t.id=n.ticket_id WHERE ${where}
      ORDER BY n.created_at DESC,n.id DESC LIMIT $3 OFFSET $4`,
      [...values, filters.pageSize, (filters.page - 1) * filters.pageSize],
    );
    return {
      items: rows.rows,
      pagination: { page: filters.page, pageSize: filters.pageSize, total },
    };
  });
}
export async function markRead(userId: string, id: string) {
  const result = await pool.query(
    'UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()) WHERE id=$1 AND user_id=$2 RETURNING id',
    [id, userId],
  );
  if (!result.rowCount)
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'No se encontró la notificación.');
}
export async function markAllRead(userId: string) {
  await pool.query(
    'UPDATE notifications SET read_at=clock_timestamp() WHERE user_id=$1 AND read_at IS NULL',
    [userId],
  );
}
