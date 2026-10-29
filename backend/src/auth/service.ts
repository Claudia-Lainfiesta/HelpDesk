import { isIP } from 'node:net';
import { pool } from '../db/pool.js';
import { transaction } from '../db/transaction.js';
import type { AuthConfig } from './config.js';
import { ApiError, authenticationRequired, invalidCredentials } from './errors.js';
import { hashPassword, validatePasswordPolicy, verifyPassword } from './password.js';
import { createSessionToken, hashSessionToken } from './session.js';
import type { AuthSession, UserRow } from './types.js';
import { userProfile } from './types.js';

const columns = `u.*, u.id::text, r.code AS role`;

export async function login(
  email: string,
  password: string,
  config: AuthConfig,
  metadata: { ip?: string; userAgent?: string; previousSessionId?: string },
) {
  const result = await transaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `SELECT ${columns}
      FROM users u JOIN roles r ON r.id = u.role_id WHERE lower(u.email) = lower($1) FOR UPDATE OF u`,
      [email],
    );
    const user = rows[0];
    const validPassword = await verifyPassword(user?.password_hash ?? null, password);
    const now = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    const reason = !user
      ? 'not_found'
      : user.locked_until && user.locked_until > now
        ? 'locked'
        : !user.is_active
          ? 'inactive'
          : user.expires_at && user.expires_at <= now
            ? 'expired'
            : !user.password_hash
              ? 'password_unset'
              : !validPassword
                ? 'invalid_password'
                : undefined;
    if (reason || !user) {
      if (user && reason !== 'locked') {
        const attempts = (user.locked_until ? 0 : user.failed_login_attempts) + 1;
        const lockedUntil =
          attempts >= config.loginMaxAttempts
            ? new Date(now.getTime() + config.loginLockMinutes * 60000)
            : null;
        await client.query(
          'UPDATE users SET failed_login_attempts = $2, locked_until = $3 WHERE id = $1',
          [user.id, attempts, lockedUntil],
        );
      }
      console.info('auth.login', { result: 'rejected', reason });
      return undefined;
    }
    await client.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = $2 WHERE id = $1',
      [user.id, now],
    );
    if (metadata.previousSessionId) {
      await client.query(
        'UPDATE sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE id = $1',
        [metadata.previousSessionId, now],
      );
    }
    const token = createSessionToken();
    const { rows: sessions } = await client.query<{ expires_at: Date }>(
      `
      INSERT INTO sessions (user_id, token_hash, expires_at, ip, user_agent)
      VALUES ($1, $2, clock_timestamp() + $3 * interval '1 hour', $4, $5)
      RETURNING expires_at`,
      [
        user.id,
        hashSessionToken(token),
        config.sessionAbsoluteHours,
        metadata.ip && isIP(metadata.ip) ? metadata.ip : null,
        metadata.userAgent?.slice(0, 512) ?? null,
      ],
    );
    return { profile: userProfile(user), token, expiresAt: sessions[0]!.expires_at };
  });
  if (!result) throw invalidCredentials();
  return result;
}

export async function changePassword(
  auth: AuthSession,
  currentPassword: string,
  newPassword: string,
  config: AuthConfig,
) {
  return transaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `SELECT ${columns} FROM users u
      JOIN roles r ON r.id = u.role_id WHERE u.id = $1 FOR UPDATE OF u`,
      [auth.user.id],
    );
    const user = rows[0];
    const validSession = await client.query(
      `SELECT id FROM sessions WHERE id = $1 AND user_id = $2
      AND revoked_at IS NULL AND expires_at > clock_timestamp()
      AND created_at + $3 * interval '1 hour' > clock_timestamp()
      AND last_seen_at + $4 * interval '1 minute' > clock_timestamp() FOR UPDATE`,
      [auth.sessionId, auth.user.id, config.sessionAbsoluteHours, config.sessionIdleMinutes],
    );
    const now = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    if (
      !user ||
      !validSession.rowCount ||
      !user.is_active ||
      (user.expires_at && user.expires_at <= now)
    ) {
      throw authenticationRequired();
    }
    validatePasswordPolicy(newPassword, user.email);
    if (!(await verifyPassword(user.password_hash, currentPassword))) throw invalidCredentials();
    if (newPassword === currentPassword) {
      throw new ApiError(
        400,
        'PASSWORD_POLICY',
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }
    const passwordHash = await hashPassword(newPassword);
    await client.query(
      `UPDATE users SET password_hash = $2, must_change_password = false,
      password_changed_at = clock_timestamp(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [user.id, passwordHash],
    );
    await client.query(
      `UPDATE sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp())
      WHERE user_id = $1 AND id <> $2`,
      [user.id, auth.sessionId],
    );
    return userProfile({ ...user, must_change_password: false });
  });
}

export async function purgeSessions(idleMinutes: number): Promise<number> {
  const result = await pool.query(
    `DELETE FROM sessions
    WHERE expires_at < clock_timestamp() - interval '7 days'
      OR revoked_at < clock_timestamp() - interval '7 days'
      OR last_seen_at + $1 * interval '1 minute' < clock_timestamp() - interval '7 days'`,
    [idleMinutes],
  );
  return result.rowCount ?? 0;
}
