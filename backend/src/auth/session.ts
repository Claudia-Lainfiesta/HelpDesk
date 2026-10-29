import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import type { AuthConfig } from './config.js';
import { userProfile } from './types.js';
import type { UserRow } from './types.js';

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionCookie(config: Pick<AuthConfig, 'nodeEnv'>) {
  const production = config.nodeEnv === 'production';
  return {
    name: production ? '__Host-hd_session' : 'hd_session',
    options: {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
    } satisfies CookieOptions,
  };
}

export function readSessionToken(req: Request, config: AuthConfig): string | undefined {
  const name = sessionCookie(config).name;
  const entries = (req.headers.cookie ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(`${name}=`));
  if (entries.length !== 1) return undefined;
  const token = entries[0]?.slice(name.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

export function clearSessionCookie(res: Response, config: AuthConfig): void {
  const cookie = sessionCookie(config);
  res.clearCookie(cookie.name, cookie.options);
}

export function attachSession(config: AuthConfig = env): RequestHandler {
  return async (req, res, next) => {
    const token = readSessionToken(req, config);
    if (!token) {
      next();
      return;
    }
    const { rows } = await pool.query<UserRow & { session_id: string }>(
      `
      SELECT u.*, u.id::text, r.code AS role, s.id AS session_id
      FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL
        AND s.expires_at > clock_timestamp()
        AND s.created_at + $2 * interval '1 hour' > clock_timestamp()
        AND s.last_seen_at + $3 * interval '1 minute' > clock_timestamp()
        AND u.is_active AND (u.expires_at IS NULL OR u.expires_at > clock_timestamp())
    `,
      [hashSessionToken(token), config.sessionAbsoluteHours, config.sessionIdleMinutes],
    );
    const user = rows[0];
    if (!user) {
      clearSessionCookie(res, config);
      next();
      return;
    }
    await pool.query(
      `UPDATE sessions SET last_seen_at = clock_timestamp()
      WHERE id = $1 AND revoked_at IS NULL
        AND last_seen_at <= clock_timestamp() - interval '1 minute'`,
      [user.session_id],
    );
    req.auth = { sessionId: user.session_id, user: userProfile(user) };
    next();
  };
}
