import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { recordAudit } from '../audit/audit.js';
import type { AuditActor } from '../audit/audit.js';
import { ApiError } from '../auth/errors.js';
import { hashPassword, validatePasswordPolicy } from '../auth/password.js';
import type { RoleCode } from '../auth/types.js';
import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import { isUniqueViolation } from '../http/validation.js';
import type { UserConfig } from './config.js';
import type { CreateUserInput, UpdateUserInput } from './validation.js';

const columns = `u.id::text, u.full_name, u.email, r.code AS role, u.auth_provider,
  u.is_active, u.must_change_password, u.expires_at, u.created_by::text, u.notes,
  u.is_temporary, u.created_at, u.updated_at, u.failed_login_attempts, u.locked_until,
  u.last_login_at, u.password_changed_at`;
interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: RoleCode;
  auth_provider: 'local' | 'directory';
  is_active: boolean;
  must_change_password: boolean;
  expires_at: Date | null;
  created_by: string | null;
  notes: string | null;
  is_temporary: boolean;
  created_at: Date;
  updated_at: Date;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  password_changed_at: Date | null;
}

function view(user: ManagedUser) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    roleCode: user.role,
    authProvider: user.auth_provider,
    isActive: user.is_active,
    mustChangePassword: user.must_change_password,
    expiresAt: user.expires_at?.toISOString() ?? null,
    temporary: user.expires_at !== null,
    expirationRequired: user.is_temporary,
    createdBy: user.created_by,
    notes: user.notes,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
    failedLoginAttempts: user.failed_login_attempts,
    lockedUntil: user.locked_until?.toISOString() ?? null,
    lastLoginAt: user.last_login_at?.toISOString() ?? null,
    passwordChangedAt: user.password_changed_at?.toISOString() ?? null,
  };
}

export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

async function find(
  client: Pick<PoolClient, 'query'>,
  id: string,
  lock = false,
): Promise<ManagedUser> {
  const result = await client.query<ManagedUser>(
    `SELECT ${columns} FROM users u
    JOIN roles r ON r.id = u.role_id WHERE u.id = $1 ${lock ? 'FOR UPDATE OF u' : ''}`,
    [id],
  );
  if (!result.rows[0]) throw new ApiError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
  return result.rows[0];
}

async function roleId(client: PoolClient, code: RoleCode): Promise<number> {
  const result = await client.query<{ id: number }>('SELECT id FROM roles WHERE code = $1', [code]);
  if (!result.rows[0]) throw new ApiError(400, 'INVALID_ROLE', 'El rol no existe.');
  return result.rows[0].id;
}

async function administrativeTransaction<T>(
  actor: AuditActor,
  action: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return transaction(async (client) => {
    // Serializa las decisiones sobre el último administrador entre procesos.
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [1212437843, 1]);
    const permission = await client.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND r.code = 'administrador' AND u.is_active
        AND (u.expires_at IS NULL OR u.expires_at > clock_timestamp())`,
      [actor.userId],
    );
    if (!permission.rowCount)
      throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para esta operación.');
    return action(client);
  });
}

function expiration(
  value: string | null,
  user: { created_at: Date; auth_provider: string; is_temporary: boolean },
  now: Date,
  config: UserConfig,
): Date | null {
  if (value === null) {
    if (user.is_temporary)
      throw new ApiError(
        400,
        'TEMP_EXPIRY_REQUIRED',
        'La cuenta temporal debe conservar una fecha de vencimiento.',
      );
    return null;
  }
  if (user.auth_provider !== 'local')
    throw new ApiError(
      400,
      'TEMP_LOCAL_REQUIRED',
      'Las cuentas con vencimiento deben ser locales.',
    );
  const date = new Date(value);
  if (
    date <= now ||
    date.getTime() > user.created_at.getTime() + config.tempAccountMaxDays * 86400000
  ) {
    throw new ApiError(
      400,
      'INVALID_EXPIRATION',
      'El vencimiento debe ser futuro y respetar el máximo contado desde la creación de la cuenta.',
    );
  }
  return date;
}

async function protectAdministrator(
  client: PoolClient,
  before: ManagedUser,
  after: { role: RoleCode; isActive: boolean; expiresAt: Date | null },
) {
  if (before.role !== 'administrador' || !before.is_active) return;
  const removesGuarantee =
    after.role !== 'administrador' || !after.isActive || after.expiresAt !== null;
  if (!removesGuarantee) return;
  const others = await client.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id <> $1 AND r.code = 'administrador' AND u.is_active AND u.expires_at IS NULL
      AND u.auth_provider = 'local' AND u.password_hash IS NOT NULL LIMIT 1`,
    [before.id],
  );
  if (!others.rowCount)
    throw new ApiError(
      409,
      'LAST_ADMINISTRATOR',
      'Debe conservarse al menos un administrador activo sin vencimiento.',
    );
}

export interface UserFilters {
  page: number;
  pageSize: number;
  role?: RoleCode;
  active?: boolean;
  provider?: 'local' | 'directory';
  temporary?: boolean;
  expired?: boolean;
  q?: string;
}
export async function listUsers(filters: UserFilters) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const add = (condition: string, value: unknown) => {
    values.push(value);
    conditions.push(condition.replace('?', `$${values.length}`));
  };
  if (filters.role !== undefined) add('r.code = ?', filters.role);
  if (filters.active !== undefined) add('u.is_active = ?', filters.active);
  if (filters.provider !== undefined) add('u.auth_provider = ?', filters.provider);
  if (filters.temporary !== undefined)
    conditions.push(`u.expires_at IS ${filters.temporary ? 'NOT ' : ''}NULL`);
  if (filters.expired !== undefined)
    conditions.push(
      filters.expired
        ? 'u.expires_at <= clock_timestamp()'
        : '(u.expires_at IS NULL OR u.expires_at > clock_timestamp())',
    );
  if (filters.q) {
    values.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  // Una instantánea compartida conserva un total coherente incluso para páginas vacías.
  return transaction(async (client) => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const count = await client.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
      values,
    );
    const result = await client.query<ManagedUser>(
      `SELECT ${columns} FROM users u JOIN roles r ON r.id = u.role_id ${where}
      ORDER BY u.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.pageSize, (filters.page - 1) * filters.pageSize],
    );
    return {
      data: result.rows.map(view),
      page: filters.page,
      pageSize: filters.pageSize,
      total: Number(count.rows[0]!.total),
    };
  });
}

export async function getUser(id: string) {
  return view(await find(pool, id));
}

export async function createUser(input: CreateUserInput, actor: AuditActor, config: UserConfig) {
  try {
    return await administrativeTransaction(actor, async (client) => {
      const now = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!
        .now;
      const expiresValue =
        input.expiresAt ??
        (input.temporary
          ? new Date(now.getTime() + config.tempAccountDefaultDays * 86400000).toISOString()
          : null);
      const expiresAt = expiration(
        expiresValue,
        { created_at: now, auth_provider: input.authProvider, is_temporary: input.temporary },
        now,
        config,
      );
      const password = input.authProvider === 'local' ? generateTemporaryPassword() : undefined;
      if (password) validatePasswordPolicy(password, input.email);
      const passwordHash = password ? await hashPassword(password) : null;
      const result = await client.query<{ id: string }>(
        `INSERT INTO users
        (full_name, email, role_id, auth_provider, password_hash, must_change_password, expires_at, notes, created_by, is_temporary, created_at)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10) RETURNING id::text`,
        [
          input.fullName,
          input.email,
          await roleId(client, input.roleCode),
          input.authProvider,
          passwordHash,
          expiresAt,
          input.notes ?? null,
          actor.userId,
          input.temporary,
          now,
        ],
      );
      const id = result.rows[0]!.id;
      await recordAudit(client, {
        actor,
        action: 'users.created',
        targetType: 'user',
        targetId: id,
        metadata: {
          role: input.roleCode,
          authProvider: input.authProvider,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      });
      return {
        ...view(await find(client, id)),
        ...(password ? { temporaryPassword: password } : {}),
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, 'EMAIL_EXISTS', 'El correo ya existe.');
    throw error;
  }
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: AuditActor,
  config: UserConfig,
) {
  return administrativeTransaction(actor, async (client) => {
    const user = await find(client, id, true);
    const role = input.roleCode ?? user.role;
    if (id === actor.userId && role !== user.role)
      throw new ApiError(409, 'SELF_ROLE_CHANGE', 'No puedes cambiar tu propio rol.');
    const now = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    const expiresAt =
      input.expiresAt === undefined
        ? user.expires_at
        : expiration(input.expiresAt, user, now, config);
    if (role !== user.role || input.expiresAt !== undefined) {
      await protectAdministrator(client, user, { role, isActive: user.is_active, expiresAt });
    }
    await client.query(
      `UPDATE users SET full_name = $2, role_id = $3, expires_at = $4, notes = $5 WHERE id = $1`,
      [
        id,
        input.fullName ?? user.full_name,
        await roleId(client, role),
        expiresAt,
        input.notes === undefined ? user.notes : input.notes,
      ],
    );
    if (role !== user.role)
      await recordAudit(client, {
        actor,
        action: 'users.role_changed',
        targetType: 'user',
        targetId: id,
        metadata: { previousRole: user.role, role },
      });
    if (expiresAt?.getTime() !== user.expires_at?.getTime())
      await recordAudit(client, {
        actor,
        action: 'users.expiration_changed',
        targetType: 'user',
        targetId: id,
        metadata: {
          previousExpiresAt: user.expires_at?.toISOString() ?? null,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      });
    const changedFields: ('fullName' | 'notes')[] = [];
    if (input.fullName !== undefined && input.fullName !== user.full_name)
      changedFields.push('fullName');
    if (input.notes !== undefined && input.notes !== user.notes) changedFields.push('notes');
    if (changedFields.length)
      await recordAudit(client, {
        actor,
        action: 'users.updated',
        targetType: 'user',
        targetId: id,
        metadata: { changedFields },
      });
    return view(await find(client, id));
  });
}

export type UserAction = 'deactivate' | 'reactivate' | 'reset-password' | 'unlock';
export async function userAction(id: string, action: UserAction, actor: AuditActor) {
  return administrativeTransaction(actor, async (client) => {
    const user = await find(client, id, true);
    if (id === actor.userId && action === 'deactivate')
      throw new ApiError(409, 'SELF_DEACTIVATION', 'No puedes desactivar tu propia cuenta.');
    if (id === actor.userId && action === 'reset-password')
      throw new ApiError(
        409,
        'SELF_PASSWORD_RESET',
        'Usa change-password para cambiar tu propia contraseña.',
      );
    let password: string | undefined;
    if (action === 'reset-password') {
      if (user.auth_provider === 'directory')
        throw new ApiError(
          409,
          'DIRECTORY_ACCOUNT',
          'La contraseña se gestiona en el directorio corporativo.',
        );
      password = generateTemporaryPassword();
      validatePasswordPolicy(password, user.email);
      await client.query(
        `UPDATE users SET password_hash = $2, must_change_password = true,
        failed_login_attempts = 0, locked_until = NULL, password_changed_at = clock_timestamp() WHERE id = $1`,
        [id, await hashPassword(password)],
      );
    } else if (action === 'unlock') {
      await client.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [id],
      );
    } else {
      const active = action === 'reactivate';
      if (!active)
        await protectAdministrator(client, user, {
          role: user.role,
          isActive: false,
          expiresAt: user.expires_at,
        });
      await client.query('UPDATE users SET is_active = $2 WHERE id = $1', [id, active]);
    }
    if (action === 'deactivate' || action === 'reset-password') {
      await client.query(
        'UPDATE sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp()) WHERE user_id = $1',
        [id],
      );
    }
    const actions = {
      deactivate: 'users.deactivated',
      reactivate: 'users.reactivated',
      'reset-password': 'users.password_reset',
      unlock: 'users.unlocked',
    } as const;
    await recordAudit(client, { actor, action: actions[action], targetType: 'user', targetId: id });
    return {
      ...view(await find(client, id)),
      ...(password ? { temporaryPassword: password } : {}),
    };
  });
}
