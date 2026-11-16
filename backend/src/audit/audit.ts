import { isIP } from 'node:net';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { statusSchema, prioritySchema } from '../tickets/validation.js';
import { idSchema } from '../http/validation.js';

const role = z.enum(['solicitante', 'agente', 'supervisor', 'administrador']);
const metadataSchema = z
  .object({
    role: role.optional(),
    previousRole: role.optional(),
    expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    previousExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    ticketNumber: z
      .string()
      .regex(/^TK-\d{6,}$/)
      .optional(),
    categoryId: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),
    fromPriority: prioritySchema.optional(),
    noteId: idSchema.optional(),
    toPriority: prioritySchema.optional(),
    fromStatus: statusSchema.optional(),
    toStatus: statusSchema.optional(),
    fromAgentId: idSchema.nullable().optional(),
    toAgentId: idSchema.nullable().optional(),
    isActive: z.boolean().optional(),
    changedFields: z
      .array(z.enum(['fullName', 'notes', 'name', 'description', 'telegramUsername']))
      .optional(),
  })
  .strict();

export type AuditAction =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.reassigned'
  | 'ticket.unassigned'
  | 'ticket.status_changed'
  | 'ticket.priority_changed'
  | 'ticket.note_added'
  | 'auth.recovery_requested'
  | 'users.created'
  | 'users.updated'
  | 'users.role_changed'
  | 'users.expiration_changed'
  | 'users.deactivated'
  | 'users.reactivated'
  | 'users.password_reset'
  | 'users.unlocked'
  | 'categories.created'
  | 'categories.updated'
  | 'categories.activated'
  | 'categories.deactivated';

export interface AuditActor {
  userId: string;
  ip?: string;
}
export interface AuditEvent {
  actor: AuditActor | null;
  ip?: string;
  action: AuditAction;
  targetType: 'user' | 'category' | 'ticket';
  targetId: string;
  metadata?: z.infer<typeof metadataSchema>;
}

export async function recordAudit(
  client: Pick<PoolClient, 'query'>,
  event: AuditEvent,
): Promise<void> {
  const parsed = metadataSchema.safeParse(event.metadata ?? {});
  if (!parsed.success) throw new Error('Metadatos de auditoría no permitidos.');
  const ip = event.ip ?? event.actor?.ip;
  await client.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata, ip)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      event.actor?.userId ?? null,
      event.action,
      event.targetType,
      event.targetId,
      JSON.stringify(parsed.data),
      ip && isIP(ip) ? ip : null,
    ],
  );
}
