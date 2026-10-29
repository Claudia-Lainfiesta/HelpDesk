import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig } from '../../src/auth/config.js';
import { hashPassword } from '../../src/auth/password.js';

const databaseUrl = process.env.DATABASE_URL?.trim();
const reason =
  'SKIP: autenticación integrada requiere DATABASE_URL exportada y migraciones aplicadas.';
if (!databaseUrl) console.info(reason);

describe.skipIf(!databaseUrl)(databaseUrl ? 'autenticación contra PostgreSQL real' : reason, () => {
  let pool: Pool;
  let createApp: (config?: AuthConfig) => Express;
  let protectedApp: Express;
  let app: Express;
  let config: AuthConfig;
  let sessionHash: (token: string) => string;
  let ids: string[];
  let secrets: string[];
  let logs: unknown[][];

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    vi.stubEnv('POSTGRES_USER', decodeURIComponent(url.username));
    vi.stubEnv('POSTGRES_PASSWORD', decodeURIComponent(url.password));
    vi.stubEnv('POSTGRES_DB', url.pathname.slice(1));
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('TELEGRAM_ALLOWED_USER_IDS', '');
    const { env } = await import('../../src/config/env.js');
    config = {
      ...env,
      nodeEnv: 'test',
      trustProxy: false,
      frontendOrigin: 'http://localhost:4200',
    };
    ({ pool } = await import('../../src/db/pool.js'));
    ({ createApp } = await import('../../src/app.js'));
    const { attachSession, hashSessionToken } = await import('../../src/auth/session.js');
    sessionHash = hashSessionToken;
    const { requireAuth, requireRole, enforcePasswordChange } =
      await import('../../src/auth/middlewares.js');
    const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
    protectedApp = express();
    protectedApp.use(attachSession(config), enforcePasswordChange);
    protectedApp.get('/api/test/private', requireAuth, (_req, res) => {
      res.sendStatus(204);
    });
    protectedApp.get('/api/test/agent', requireRole('agente'), (_req, res) => {
      res.sendStatus(204);
    });
    protectedApp.get('/api/test/admin', requireRole('administrador'), (_req, res) => {
      res.sendStatus(204);
    });
    protectedApp.use(errorHandler);
  });

  beforeEach(() => {
    app = createApp(config);
    ids = [];
    secrets = [];
    logs = [];
    for (const method of ['info', 'error', 'warn'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logs.push(args);
      });
    }
  });

  afterEach(async () => {
    try {
      const recorded = JSON.stringify(logs);
      for (const secret of secrets) expect(recorded.includes(secret)).toBe(false);
    } finally {
      if (ids.length) {
        await pool.query('DELETE FROM sessions WHERE user_id = ANY($1::bigint[])', [ids]);
        await pool.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
      }
    }
  });
  afterAll(async () => {
    await pool?.end();
  });

  async function user(
    options: {
      active?: boolean;
      expired?: boolean;
      temporary?: boolean;
      passwordUnset?: boolean;
    } = {},
  ) {
    const email = `auth-${randomUUID()}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const hash = await hashPassword(password);
    secrets.push(password, hash);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users
      (full_name, email, role_id, password_hash, is_active, expires_at, must_change_password)
      VALUES ('Prueba de autenticación', $1, (SELECT id FROM roles WHERE code = 'agente'), $2, $3,
        CASE WHEN $4::boolean THEN clock_timestamp() - interval '1 second' ELSE NULL END, $5)
      RETURNING id::text`,
      [
        email,
        options.passwordUnset ? null : hash,
        options.active ?? true,
        options.expired ?? false,
        options.temporary ?? false,
      ],
    );
    ids.push(rows[0]!.id);
    return { id: rows[0]!.id, email, password };
  }

  const post = (path: string, target = app) =>
    request(target).post(path).set('Origin', config.frontendOrigin);
  function cookie(response: { headers: Record<string, unknown> }): string {
    const headers = response.headers['set-cookie'] as string[] | undefined;
    const pair = headers?.[0]?.split(';')[0] ?? '';
    const value = pair.slice(pair.indexOf('=') + 1);
    if (value) secrets.push(value);
    return pair;
  }
  async function login(account: { email: string; password: string }, target = app) {
    const response = await post('/api/auth/login', target).send({
      email: account.email,
      password: account.password,
    });
    expect(response.status).toBe(200);
    return { response, cookie: cookie(response) };
  }
  async function storedSessions(userId: string) {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at',
      [userId],
    );
    for (const row of result.rows) secrets.push(row.token_hash);
    return result.rows;
  }

  it('login y me: perfil público, cookie segura y solo hash del token en PostgreSQL', async () => {
    const account = await user();
    const auth = await login({ email: account.email.toUpperCase(), password: account.password });
    const header = (auth.response.headers['set-cookie'] as string[] | undefined)?.[0] ?? '';
    expect(header.includes('HttpOnly')).toBe(true);
    expect(header.includes('SameSite=Lax')).toBe(true);
    expect(header.includes('Secure')).toBe(false);
    const token = auth.cookie.slice(auth.cookie.indexOf('=') + 1);
    expect(Buffer.from(token, 'base64url').length).toBe(32);
    const sessions = await storedSessions(account.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].token_hash === sessionHash(token)).toBe(true);
    expect(JSON.stringify(sessions).includes(token)).toBe(false);
    const me = await request(app).get('/api/auth/me').set('Cookie', auth.cookie);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      id: account.id,
      fullName: 'Prueba de autenticación',
      email: account.email,
      role: 'agente',
      mustChangePassword: false,
      expiresAt: null,
    });
    expect(JSON.stringify(me.body).includes(account.password)).toBe(false);
  });

  it('login de producción usa Host, HttpOnly, Lax y Secure sin Domain', async () => {
    const account = await user();
    const production = createApp({ ...config, nodeEnv: 'production' });
    const auth = await login(account, production);
    const header = (auth.response.headers['set-cookie'] as string[] | undefined)?.[0] ?? '';
    expect(header.startsWith('__Host-hd_session=')).toBe(true);
    expect(header.includes('Secure')).toBe(true);
    expect(header.includes('HttpOnly')).toBe(true);
    expect(header.includes('SameSite=Lax')).toBe(true);
    expect(header.includes('Domain=')).toBe(false);
  });

  it('correo inexistente, clave errónea, inactivo, vencido, bloqueado y sin hash responden igual', async () => {
    const active = await user();
    const inactive = await user({ active: false });
    const expired = await user({ expired: true });
    const unset = await user({ passwordUnset: true });
    const locked = await user();
    await pool.query(
      "UPDATE users SET locked_until = clock_timestamp() + interval '15 minutes' WHERE id = $1",
      [locked.id],
    );
    const wrong = randomBytes(24).toString('base64url');
    secrets.push(wrong);
    const cases = [
      { email: `absent-${randomUUID()}@example.invalid`, password: wrong },
      { email: active.email, password: wrong },
      inactive,
      expired,
      locked,
      unset,
    ];
    for (const account of cases) {
      const response = await post('/api/auth/login').send({
        email: account.email,
        password: account.password,
      });
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' },
      });
    }
  });

  it('cuenta los fallos, bloquea tras N y permite entrar al vencer el bloqueo', async () => {
    const account = await user();
    const wrong = randomBytes(24).toString('base64url');
    secrets.push(wrong);
    for (let i = 0; i < config.loginMaxAttempts; i++) {
      expect(
        (await post('/api/auth/login').send({ email: account.email, password: wrong })).status,
      ).toBe(401);
    }
    let row = (
      await pool.query(
        'SELECT failed_login_attempts, locked_until, last_login_at FROM users WHERE id = $1',
        [account.id],
      )
    ).rows[0];
    expect(row.failed_login_attempts).toBe(config.loginMaxAttempts);
    expect(row.locked_until instanceof Date).toBe(true);
    expect(
      (await post('/api/auth/login').send({ email: account.email, password: account.password }))
        .status,
    ).toBe(401);
    await pool.query(
      "UPDATE users SET locked_until = clock_timestamp() - interval '1 second' WHERE id = $1",
      [account.id],
    );
    await login(account);
    row = (
      await pool.query(
        'SELECT failed_login_attempts, locked_until, last_login_at FROM users WHERE id = $1',
        [account.id],
      )
    ).rows[0];
    expect(row.failed_login_attempts).toBe(0);
    expect(row.locked_until).toBeNull();
    expect(row.last_login_at instanceof Date).toBe(true);
  });

  it('un inicio correcto reinicia fallos consecutivos antes de llegar al bloqueo', async () => {
    const account = await user();
    const wrong = randomBytes(24).toString('base64url');
    secrets.push(wrong);
    await post('/api/auth/login').send({ email: account.email, password: wrong });
    await post('/api/auth/login').send({ email: account.email, password: wrong });
    await login(account);
    const row = (
      await pool.query('SELECT failed_login_attempts FROM users WHERE id = $1', [account.id])
    ).rows[0];
    expect(row.failed_login_attempts).toBe(0);
  });

  it('logout revoca, limpia la cookie y es idempotente', async () => {
    const account = await user();
    const auth = await login(account);
    const response = await post('/api/auth/logout').set('Cookie', auth.cookie).send({});
    expect(response.status).toBe(204);
    expect((await storedSessions(account.id))[0].revoked_at instanceof Date).toBe(true);
    expect((await request(app).get('/api/auth/me').set('Cookie', auth.cookie)).status).toBe(401);
    expect((await post('/api/auth/logout').set('Cookie', auth.cookie).send({})).status).toBe(204);
    expect(
      ((response.headers['set-cookie'] as string[] | undefined)?.[0] ?? '').includes('1970'),
    ).toBe(true);
  });

  it.each(['revoked', 'idle', 'absolute', 'created', 'account_expired', 'inactive'])(
    'la siguiente petición rechaza una sesión inválida: %s',
    async (mode) => {
      const account = await user();
      const auth = await login(account);
      const statements: Record<string, string> = {
        revoked: 'UPDATE sessions SET revoked_at = clock_timestamp() WHERE user_id = $1',
        idle: "UPDATE sessions SET last_seen_at = clock_timestamp() - interval '31 minutes' WHERE user_id = $1",
        absolute:
          "UPDATE sessions SET expires_at = clock_timestamp() - interval '1 second' WHERE user_id = $1",
        created:
          "UPDATE sessions SET created_at = clock_timestamp() - interval '9 hours' WHERE user_id = $1",
        account_expired:
          "UPDATE users SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1",
        inactive: 'UPDATE users SET is_active = false WHERE id = $1',
      };
      await pool.query(statements[mode]!, [account.id]);
      expect((await request(app).get('/api/auth/me').set('Cookie', auth.cookie)).status).toBe(401);
    },
  );

  it('last_seen_at se actualiza como máximo una vez por minuto, sin extender el límite absoluto', async () => {
    const account = await user();
    const auth = await login(account);
    const first = (await storedSessions(account.id))[0];
    await request(app).get('/api/auth/me').set('Cookie', auth.cookie);
    expect((await storedSessions(account.id))[0].last_seen_at.getTime()).toBe(
      first.last_seen_at.getTime(),
    );
    await pool.query(
      "UPDATE sessions SET last_seen_at = clock_timestamp() - interval '2 minutes' WHERE user_id = $1",
      [account.id],
    );
    const old = (await storedSessions(account.id))[0];
    await request(app).get('/api/auth/me').set('Cookie', auth.cookie);
    const updated = (await storedSessions(account.id))[0];
    expect(updated.last_seen_at > old.last_seen_at).toBe(true);
    expect(updated.expires_at.getTime()).toBe(first.expires_at.getTime());
  });

  it('contraseña temporal: me y logout permitidos; otras rutas bloqueadas', async () => {
    const account = await user({ temporary: true });
    const auth = await login(account);
    const blocked = await request(protectedApp).get('/api/test/private').set('Cookie', auth.cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', auth.cookie)).body.mustChangePassword,
    ).toBe(true);
    expect((await request(app).get('/api/health').set('Cookie', auth.cookie)).status).toBe(200);
    expect((await post('/api/auth/logout').set('Cookie', auth.cookie).send({})).status).toBe(204);
  });

  it('change-password valida la clave actual y la política; conserva la sesión actual y revoca las demás', async () => {
    const account = await user({ temporary: true });
    const first = await login(account);
    const other = await login(account);
    const nextPassword = randomBytes(24).toString('base64url');
    const wrong = randomBytes(24).toString('base64url');
    secrets.push(nextPassword, wrong);
    const change = (currentPassword: string, newPassword: string) =>
      post('/api/auth/change-password')
        .set('Cookie', first.cookie)
        .send({ currentPassword, newPassword });
    expect((await change(wrong, nextPassword)).status).toBe(401);
    expect((await change(account.password, 'x')).status).toBe(400);
    expect((await change(account.password, account.email)).status).toBe(400);
    expect((await change(account.password, account.password)).status).toBe(400);
    const response = await change(account.password, nextPassword);
    expect(response.status).toBe(200);
    expect(response.body.mustChangePassword).toBe(false);
    expect((await request(app).get('/api/auth/me').set('Cookie', first.cookie)).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Cookie', other.cookie)).status).toBe(401);
    const row = (
      await pool.query(
        'SELECT password_hash, password_changed_at, must_change_password FROM users WHERE id = $1',
        [account.id],
      )
    ).rows[0];
    secrets.push(row.password_hash);
    expect(row.must_change_password).toBe(false);
    expect(row.password_changed_at instanceof Date).toBe(true);
    expect(row.password_hash.includes(nextPassword)).toBe(false);
    expect(
      (await post('/api/auth/login').send({ email: account.email, password: account.password }))
        .status,
    ).toBe(401);
    await login({ email: account.email, password: nextPassword });
  });

  it('requireRole permite, rechaza y exige sesión en rutas exclusivas de prueba', async () => {
    const account = await user();
    const auth = await login(account);
    expect(
      (await request(protectedApp).get('/api/test/agent').set('Cookie', auth.cookie)).status,
    ).toBe(204);
    expect(
      (await request(protectedApp).get('/api/test/admin').set('Cookie', auth.cookie)).status,
    ).toBe(403);
    expect((await request(protectedApp).get('/api/test/agent')).status).toBe(401);
  });

  it('CSRF y JSON se verifican antes de procesar credenciales', async () => {
    const account = await user();
    const body = { email: account.email, password: account.password };
    expect(
      (await request(app).post('/api/auth/login').set('Origin', 'https://otro.invalid').send(body))
        .status,
    ).toBe(403);
    expect((await request(app).post('/api/auth/login').send(body)).status).toBe(403);
    expect((await post('/api/auth/login').send('no es JSON')).status).toBe(415);
    const malformed = await post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
  });

  it('el límite por IP devuelve 429 independientemente de si existe el correo', async () => {
    const limited = createApp({ ...config, loginRateLimitPerIp: 2 });
    const password = randomBytes(24).toString('base64url');
    secrets.push(password);
    const body = { email: `absent-${randomUUID()}@example.invalid`, password };
    expect((await post('/api/auth/login', limited).send(body)).status).toBe(401);
    expect((await post('/api/auth/login', limited).send(body)).status).toBe(401);
    const response = await post('/api/auth/login', limited).send(body);
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('LOGIN_RATE_LIMIT');
  });
});
