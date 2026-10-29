import { isIP } from 'node:net';
import type { PoolClient } from 'pg';
import { z } from 'zod';

const role = z.enum(['solicitante', 'agente', 'supervisor', 'administrador']);
const metadataSchema = z
  .object({
    role: role.optional(),
    previousRole: role.optional(),
    authProvider: z.enum(['local', 'directory']).optional(),
    expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    previousExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().optional(),
    changedFields: z.array(z.enum(['fullName', 'notes', 'name', 'description'])).optional(),
  })
  .strict();

export type AuditAction =
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
  action: AuditAction;
  targetType: 'user' | 'category';
  targetId: string;
  metadata?: z.infer<typeof metadataSchema>;
}

export async function recordAudit(
  client: Pick<PoolClient, 'query'>,
  event: AuditEvent,
): Promise<void> {
  const parsed = metadataSchema.safeParse(event.metadata ?? {});
  if (!parsed.success) throw new Error('Metadatos de auditoría no permitidos.');
  await client.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata, ip)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      event.actor?.userId ?? null,
      event.action,
      event.targetType,
      event.targetId,
      JSON.stringify(parsed.data),
      event.actor?.ip && isIP(event.actor.ip) ? event.actor.ip : null,
    ],
  );
}
