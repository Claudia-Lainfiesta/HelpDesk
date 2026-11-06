import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
import { recoveryResponse } from '../../src/auth/recovery/response.js';

const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('../../src/mail/default.js', () => ({ mailer: { sendRecoveryNotice: mail.send } }));
const databaseUrl = process.env.DATABASE_URL?.trim();
const reason =
  'SKIP: recuperación integrada requiere DATABASE_URL exportada; usa un esquema aislado y SMTP simulado.';
if (!databaseUrl) console.info(reason);
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe.skipIf(!databaseUrl)('recuperación asistida con PostgreSQL real y correo simulado', () => {
  let setup: pg.Client;
  let pool: pg.Pool;
  let app: Express;
  let created = false;
  const schema = `hd_recovery_test_${randomUUID().replaceAll('-', '')}`;
  const origin = 'http://localhost:4200';
  let logs: unknown[][];
  let sensitive: string[];
  beforeAll(async () => {
    setup = new pg.Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA ${schema}`);
    created = true;
    await setup.query(`SET search_path TO ${schema},pg_catalog`);
    for (const migration of await loadMigrations()) await setup.query(migration.sql);
    const url = new URL(databaseUrl!);
    url.searchParams.set('options', `-csearch_path=${schema},pg_catalog`);
    vi.stubEnv('DATABASE_URL', url.toString());
    vi.stubEnv('POSTGRES_USER', decodeURIComponent(url.username));
    vi.stubEnv('POSTGRES_PASSWORD', decodeURIComponent(url.password));
    vi.stubEnv('POSTGRES_DB', url.pathname.slice(1));
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('TELEGRAM_ALLOWED_USER_IDS', '');
    ({ pool } = await import('../../src/db/pool.js'));
    const { env } = await import('../../src/config/env.js');
    const { createApp } = await import('../../src/app.js');
    app = createApp({ ...env, nodeEnv: 'test', trustProxy: 1, frontendOrigin: origin });
  });
  beforeEach(() => {
    mail.send.mockReset().mockResolvedValue(undefined);
    logs = [];
    sensitive = [];
    for (const method of ['log', 'info', 'warn', 'error'] as const)
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logs.push(args);
      });
  });
  afterEach(async () => {
    try {
      await settle();
      for (const value of sensitive) expect(JSON.stringify(logs)).not.toContain(value);
    } finally {
      await pool.query('DELETE FROM audit_events');
      await pool.query('DELETE FROM sessions');
      await pool.query('DELETE FROM users');
    }
  });
  afterAll(async () => {
    await pool?.end();
    if (created) await setup.query(`DROP SCHEMA ${schema} CASCADE`);
    await setup?.end();
  });
  async function fixture(
    options: {
      active?: boolean;
      expired?: boolean;
      locked?: boolean;
    } = {},
  ) {
    const email = `recovery-${randomUUID()}@example.invalid`;
    const name = `Empleado ${randomUUID()}`;
    const password = randomBytes(24).toString('base64url');
    const hash = await hashPassword(password);
    sensitive.push(email, name, password);
    if (hash) sensitive.push(hash);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (full_name,email,role_id,password_hash,is_active,must_change_password,failed_login_attempts,locked_until,expires_at)
  VALUES ($1,$2,(SELECT id FROM roles WHERE code='agente'),$3,$4,true,5,CASE WHEN $5 THEN clock_timestamp()+interval '15 minutes' ELSE NULL END,CASE WHEN $6 THEN clock_timestamp()-interval '1 day' ELSE NULL END) RETURNING id::text`,
      [
        name,
        email,
        hash,
        options.active ?? true,
        options.locked ?? false,
        options.expired ?? false,
      ],
    );
    const token = randomBytes(32).toString('base64url');
    sensitive.push(token);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    sensitive.push(tokenHash);
    await pool.query(
      "INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,clock_timestamp()+interval '8 hours')",
      [result.rows[0]!.id, tokenHash],
    );
    return { id: result.rows[0]!.id, email, name, token };
  }
  async function snapshot() {
    return {
      users: (await pool.query('SELECT * FROM users ORDER BY id')).rows,
      sessions: (await pool.query('SELECT * FROM sessions ORDER BY id')).rows,
    };
  }
  async function post(email: string, token?: string) {
    let req = request(app)
      .post('/api/auth/recovery-request')
      .set('Origin', origin)
      .set('X-Forwarded-For', '192.0.2.10');
    if (token) req = req.set('Cookie', `hd_session=${token}`);
    return req.send({ email });
  }
  it.each([false, true])(
    'cuenta elegible bloqueada=%s: un aviso, auditoría anónima y ningún cambio de cuenta o sesión',
    async (locked) => {
      const account = await fixture({ locked });
      const before = await snapshot();
      const response = await post(` ${account.email.toUpperCase()} `, account.token);
      expect(response.status).toBe(202);
      expect(response.body).toEqual(recoveryResponse);
      await settle();
      expect(mail.send).toHaveBeenCalledExactlyOnceWith({
        id: account.id,
        fullName: account.name,
        email: account.email,
      });
      expect(await snapshot()).toEqual(before);
      const { rows } = await pool.query(
        'SELECT actor_user_id, action, target_type,target_id::text,metadata,ip FROM audit_events',
      );
      expect(rows).toEqual([
        {
          actor_user_id: null,
          action: 'auth.recovery_requested',
          target_type: 'user',
          target_id: account.id,
          metadata: {},
          ip: '192.0.2.10',
        },
      ]);
      for (const value of sensitive) expect(JSON.stringify(rows)).not.toContain(value);
    },
  );
  it.each(['missing', 'inactive', 'expired'] as const)(
    '%s: mismo resultado público y sin aviso ni auditoría',
    async (kind) => {
      const account =
        kind === 'missing'
          ? null
          : await fixture({
              active: kind !== 'inactive',
              expired: kind === 'expired',
            });
      const before = await snapshot();
      const response = await post(account?.email ?? `missing-${randomUUID()}@example.invalid`);
      expect(response.status).toBe(202);
      expect(response.body).toEqual(recoveryResponse);
      await settle();
      expect(mail.send).not.toHaveBeenCalled();
      expect(
        (await pool.query('SELECT count(*)::int AS total FROM audit_events')).rows[0].total,
      ).toBe(0);
      expect(await snapshot()).toEqual(before);
    },
  );
  it('un fallo SMTP mantiene el 202 y la auditoría confirmada sin efectos sobre acceso', async () => {
    const account = await fixture({ locked: true });
    const secret = randomBytes(24).toString('hex');
    sensitive.push(secret);
    mail.send.mockRejectedValue(new Error(`${account.email} ${secret}`));
    const before = await snapshot();
    const response = await post(account.email);
    expect(response.status).toBe(202);
    expect(response.body).toEqual(recoveryResponse);
    await settle();
    await settle();
    expect(await snapshot()).toEqual(before);
    expect(
      (await pool.query('SELECT count(*)::int AS total FROM audit_events')).rows[0].total,
    ).toBe(1);
    expect(JSON.stringify(logs)).toContain('failed');
  });
});
