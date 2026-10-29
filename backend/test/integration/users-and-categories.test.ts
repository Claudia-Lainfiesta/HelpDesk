import { randomBytes, randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';
import { loadMigrations } from '../../src/db/migrations.js';

const databaseUrl = process.env.DATABASE_URL?.trim();
const skipReason =
  'SKIP: usuarios y categorías requieren DATABASE_URL exportada; se usa un esquema aislado en esa base.';
if (!databaseUrl) console.info(skipReason);

describe.skipIf(!databaseUrl)(
  'usuarios, cuentas temporales y categorías con PostgreSQL real',
  () => {
    let app: Express;
    let pool: pg.Pool;
    let setup: pg.Client;
    const schema = `hd_admin_test_${randomUUID().replaceAll('-', '')}`;
    let schemaCreated = false;
    let admin: Account;
    let agent: Account;
    let adminCookie: string;
    let agentCookie: string;
    let secrets: string[];
    let logs: unknown[][];
    const origin = 'http://localhost:4200';
    type Account = { id: string; email: string; password: string };

    beforeAll(async () => {
      setup = new pg.Client({ connectionString: databaseUrl });
      await setup.connect();
      await setup.query(`CREATE SCHEMA ${schema}`);
      schemaCreated = true;
      // No hay public en search_path: ninguna prueba puede usar los datos de desarrollo.
      await setup.query(`SET search_path TO ${schema}, pg_catalog`);
      for (const migration of await loadMigrations()) await setup.query(migration.sql);
      const url = new URL(databaseUrl!);
      url.searchParams.set('options', `-csearch_path=${schema},pg_catalog`);
      vi.stubEnv('DATABASE_URL', url.toString());
      vi.stubEnv('POSTGRES_USER', decodeURIComponent(url.username));
      vi.stubEnv('POSTGRES_PASSWORD', decodeURIComponent(url.password));
      vi.stubEnv('POSTGRES_DB', url.pathname.slice(1));
      vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
      vi.stubEnv('TELEGRAM_ALLOWED_USER_IDS', '');
      const { env } = await import('../../src/config/env.js');
      ({ pool } = await import('../../src/db/pool.js'));
      const { createApp } = await import('../../src/app.js');
      app = createApp({
        ...env,
        nodeEnv: 'test',
        trustProxy: false,
        frontendOrigin: origin,
        loginRateLimitPerIp: 10000,
        tempAccountDefaultDays: 7,
        tempAccountMaxDays: 30,
      });
    });

    beforeEach(async () => {
      secrets = [];
      logs = [];
      for (const method of ['info', 'error', 'warn', 'log'] as const) {
        vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
          logs.push(args);
        });
      }
      admin = await fixture('administrador');
      agent = await fixture('agente');
      adminCookie = await signIn(admin);
      agentCookie = await signIn(agent);
    });

    afterEach(async () => {
      try {
        const events = (await pool.query('SELECT metadata FROM audit_events')).rows;
        const recorded = JSON.stringify([logs, events]);
        for (const secret of secrets) expect(recorded.includes(secret)).toBe(false);
        for (const event of events)
          expect(/password|hash|token/i.test(JSON.stringify(event.metadata))).toBe(false);
      } finally {
        // Solo objetos del esquema privado creado por esta suite.
        await pool.query('DELETE FROM audit_events');
        await pool.query('DELETE FROM tickets');
        await pool.query('DELETE FROM sessions');
        await pool.query('UPDATE users SET created_by = NULL');
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM categories');
      }
    });

    afterAll(async () => {
      await pool?.end();
      if (schemaCreated) await setup.query(`DROP SCHEMA ${schema} CASCADE`);
      await setup?.end();
    });

    async function fixture(role: string): Promise<Account> {
      const email = `management-${randomUUID()}@example.invalid`;
      const password = randomBytes(24).toString('base64url');
      const hash = await hashPassword(password);
      secrets.push(password, hash);
      const result = await pool.query<{ id: string }>(
        `INSERT INTO users
      (full_name, email, role_id, password_hash, must_change_password)
      VALUES ('Empleado de prueba', $1, (SELECT id FROM roles WHERE code = $2), $3, false) RETURNING id::text`,
        [email, role, hash],
      );
      return { id: result.rows[0]!.id, email, password };
    }

    async function call(
      method: 'get' | 'post' | 'patch' | 'delete',
      path: string,
      body?: object,
      cookie: string | null = adminCookie,
    ) {
      let pending = request(app)[method](path);
      if (cookie) pending = pending.set('Cookie', cookie);
      if (method !== 'get') pending = pending.set('Origin', origin).send(body ?? {});
      const response = await pending;
      if (typeof response.body.temporaryPassword === 'string')
        secrets.push(response.body.temporaryPassword);
      return response;
    }

    async function signIn(account: { email: string; password: string }) {
      const response = await call(
        'post',
        '/api/auth/login',
        { email: account.email, password: account.password },
        null,
      );
      expect(response.status).toBe(200);
      const header =
        (response.headers['set-cookie'] as string[] | undefined)?.find(
          (value) => value.startsWith('hd_session=') && !value.includes('1970'),
        ) ?? '';
      const cookie = header.split(';')[0] ?? '';
      secrets.push(cookie.split('=')[1] ?? 'unused-secret');
      return cookie;
    }

    const create = (extra: object = {}) =>
      call('post', '/api/users', {
        fullName: 'Cuenta creada por API',
        email: `created-${randomUUID()}@example.invalid`,
        roleCode: 'solicitante',
        ...extra,
      });
    const category = (extra: object = {}) =>
      call('post', '/api/categories', { name: `Categoria ${randomUUID()}`, ...extra });
    async function expectEvent(action: string, id: string, type = 'user') {
      const events = await pool.query(
        `SELECT actor_user_id::text, metadata, ip FROM audit_events WHERE action = $1 AND target_type = $2 AND target_id = $3`,
        [action, type, id],
      );
      expect(events.rowCount).toBeGreaterThan(0);
      expect(events.rows[0].actor_user_id).toBe(admin.id);
    }

    const administrativeEndpoints = [
      ['get', '/api/users'],
      ['get', '/api/users/1'],
      ['post', '/api/users'],
      ['patch', '/api/users/1'],
      ['post', '/api/users/1/deactivate'],
      ['post', '/api/users/1/reactivate'],
      ['post', '/api/users/1/reset-password'],
      ['post', '/api/users/1/unlock'],
      ['post', '/api/categories'],
      ['patch', '/api/categories/1'],
    ] as const;
    it.each(administrativeEndpoints)(
      '%s %s exige sesión y administrador antes de validar el cuerpo',
      async (method, path) => {
        expect((await call(method, path, {}, null)).status).toBe(401);
        expect((await call(method, path, {}, agentCookie)).status).toBe(403);
      },
    );

    it('alta local: contraseña de un solo uso, hash en base, cambio obligatorio y consultas sin secretos', async () => {
      const response = await create({ notes: 'Comentario administrativo de prueba' });
      expect(response.status).toBe(201);
      const created = response.body;
      expect(created.temporaryPassword.length).toBe(16);
      expect(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]{16}$/.test(
          created.temporaryPassword,
        ),
      ).toBe(true);
      expect(created.mustChangePassword).toBe(true);
      expect(created.createdBy).toBe(admin.id);
      expect(response.headers['cache-control']).toBe('no-store');
      const row = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [created.id]))
        .rows[0];
      secrets.push(row.password_hash);
      expect(await verifyPassword(row.password_hash, created.temporaryPassword)).toBe(true);
      expect(JSON.stringify(row).includes(created.temporaryPassword)).toBe(false);
      const cookie = await signIn({ email: created.email, password: created.temporaryPassword });
      const blocked = await call('get', '/api/categories', undefined, cookie);
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
      const detail = await call('get', `/api/users/${created.id}`);
      const listing = await call('get', '/api/users');
      for (const result of [detail, listing]) {
        expect(result.status).toBe(200);
        expect(JSON.stringify(result.body).includes(created.temporaryPassword)).toBe(false);
        expect(JSON.stringify(result.body).includes('password_hash')).toBe(false);
        expect(JSON.stringify(result.body).includes('temporaryPassword')).toBe(false);
      }
      await expectEvent('users.created', created.id);
    });

    it('alta directory sin contraseña y login 401 genérico; reset explícitamente rechazado', async () => {
      const response = await create({ authProvider: 'directory' });
      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('temporaryPassword');
      expect(
        (await pool.query('SELECT password_hash FROM users WHERE id = $1', [response.body.id]))
          .rows[0].password_hash,
      ).toBeNull();
      const password = randomBytes(24).toString('base64url');
      secrets.push(password);
      const login = await call(
        'post',
        '/api/auth/login',
        { email: response.body.email, password },
        null,
      );
      expect(login.status).toBe(401);
      expect(login.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' },
      });
      const reset = await call('post', `/api/users/${response.body.id}/reset-password`);
      expect(reset.status).toBe(409);
      expect(reset.body.error.code).toBe('DIRECTORY_ACCOUNT');
      let rejected = false;
      try {
        await pool.query("UPDATE users SET password_hash = 'invalid' WHERE id = $1", [
          response.body.id,
        ]);
      } catch (error) {
        rejected =
          typeof error === 'object' && error !== null && 'code' in error && error.code === '23514';
      }
      expect(rejected).toBe(true);
    });

    it('rechaza correo duplicado sin distinguir mayúsculas y un rol fuera del catálogo', async () => {
      expect((await create({ email: admin.email.toUpperCase() })).status).toBe(409);
      expect((await create({ roleCode: 'auditor' })).status).toBe(400);
      expect((await create({ roleCode: 'inexistente' })).status).toBe(400);
      expect(
        (await call('patch', `/api/users/${agent.id}`, { email: 'otro@example.invalid' })).status,
      ).toBe(400);
      expect(
        (await call('patch', `/api/users/${agent.id}`, { authProvider: 'directory' })).status,
      ).toBe(400);
    });

    it.each([
      { temporary: true, authProvider: 'directory' },
      { expiresAt: new Date(Date.now() - 86400000).toISOString() },
      { temporary: true, expiresAt: new Date(Date.now() + 31 * 86400000).toISOString() },
      { authProvider: 'directory', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    ])('rechaza proveedor o vencimiento inválido: %j', async (body) => {
      expect((await create(body)).status).toBe(400);
    });

    it('temporales: fecha explícita o siete días por defecto; la fecha no puede quitarse y el máximo no se renueva', async () => {
      const explicitDate = new Date(Date.now() + 2 * 86400000).toISOString();
      const explicit = await create({ temporary: true, expiresAt: explicitDate });
      expect(explicit.status).toBe(201);
      expect(explicit.body.expiresAt).toBe(explicitDate);
      const response = await create({ temporary: true });
      expect(response.status).toBe(201);
      const created = response.body;
      expect(created.expirationRequired).toBe(true);
      expect(
        Math.abs(
          new Date(created.expiresAt).getTime() -
            new Date(created.createdAt).getTime() -
            7 * 86400000,
        ),
      ).toBeLessThan(1000);
      const cleared = await call('patch', `/api/users/${created.id}`, { expiresAt: null });
      expect(cleared.status).toBe(400);
      expect(cleared.body.error.code).toBe('TEMP_EXPIRY_REQUIRED');
      expect(
        (
          await call('patch', `/api/users/${created.id}`, {
            expiresAt: new Date(Date.now() + 31 * 86400000).toISOString(),
          })
        ).status,
      ).toBe(400);
      await pool.query(
        "UPDATE users SET created_at = clock_timestamp() - interval '20 days' WHERE id = $1",
        [created.id],
      );
      expect(
        (
          await call('patch', `/api/users/${created.id}`, {
            expiresAt: new Date(Date.now() + 11 * 86400000).toISOString(),
          })
        ).status,
      ).toBe(400);
      const changed = await call('patch', `/api/users/${created.id}`, { expiresAt: explicitDate });
      expect(changed.status).toBe(200);
      await expectEvent('users.expiration_changed', created.id);
    });

    it('una cuenta normal permite añadir y quitar un vencimiento opcional', async () => {
      expect(
        (
          await call('patch', `/api/users/${agent.id}`, {
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          })
        ).status,
      ).toBe(200);
      const response = await call('patch', `/api/users/${agent.id}`, { expiresAt: null });
      expect(response.status).toBe(200);
      expect(response.body.expiresAt).toBeNull();
    });

    it('el vencimiento rechaza el login e invalida la sesión abierta en la próxima petición', async () => {
      const response = await create({ temporary: true });
      const created = response.body;
      const cookie = await signIn({ email: created.email, password: created.temporaryPassword });
      expect((await call('get', '/api/auth/me', undefined, cookie)).status).toBe(200);
      await pool.query(
        "UPDATE users SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1",
        [created.id],
      );
      expect((await call('get', '/api/auth/me', undefined, cookie)).status).toBe(401);
      expect(
        (
          await call(
            'post',
            '/api/auth/login',
            { email: created.email, password: created.temporaryPassword },
            null,
          )
        ).status,
      ).toBe(401);
    });

    it('reset genera otra contraseña, borra bloqueos y revoca todas las sesiones; solo la nueva permite entrar', async () => {
      const oldCookie = await signIn(agent);
      await pool.query(
        "UPDATE users SET failed_login_attempts = 5, locked_until = clock_timestamp() + interval '15 minutes' WHERE id = $1",
        [agent.id],
      );
      const response = await call('post', `/api/users/${agent.id}/reset-password`);
      expect(response.status).toBe(200);
      const password = response.body.temporaryPassword;
      expect(password === agent.password).toBe(false);
      expect(response.body.mustChangePassword).toBe(true);
      expect(response.body.failedLoginAttempts).toBe(0);
      expect(response.body.lockedUntil).toBeNull();
      expect(
        (
          await pool.query(
            'SELECT count(*)::int AS count FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
            [agent.id],
          )
        ).rows[0].count,
      ).toBe(0);
      expect((await call('get', '/api/auth/me', undefined, oldCookie)).status).toBe(401);
      expect(
        (
          await call(
            'post',
            '/api/auth/login',
            { email: agent.email, password: agent.password },
            null,
          )
        ).status,
      ).toBe(401);
      await signIn({ email: agent.email, password });
      expect((await call('get', `/api/users/${agent.id}`)).body).not.toHaveProperty(
        'temporaryPassword',
      );
      await expectEvent('users.password_reset', agent.id);
    });

    it('desactivar revoca sesiones; reactivar permite entrar nuevamente', async () => {
      expect((await call('post', `/api/users/${agent.id}/deactivate`)).status).toBe(200);
      expect((await call('get', '/api/auth/me', undefined, agentCookie)).status).toBe(401);
      expect(
        (
          await pool.query(
            'SELECT count(*)::int AS count FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
            [agent.id],
          )
        ).rows[0].count,
      ).toBe(0);
      expect(
        (
          await call(
            'post',
            '/api/auth/login',
            { email: agent.email, password: agent.password },
            null,
          )
        ).status,
      ).toBe(401);
      expect((await call('post', `/api/users/${agent.id}/reactivate`)).status).toBe(200);
      await signIn(agent);
      await expectEvent('users.deactivated', agent.id);
      await expectEvent('users.reactivated', agent.id);
    });

    it('unlock limpia intentos y bloqueo sin restablecer la contraseña', async () => {
      await pool.query(
        "UPDATE users SET failed_login_attempts = 5, locked_until = clock_timestamp() + interval '15 minutes' WHERE id = $1",
        [agent.id],
      );
      const response = await call('post', `/api/users/${agent.id}/unlock`);
      expect(response.status).toBe(200);
      expect(response.body.failedLoginAttempts).toBe(0);
      expect(response.body.lockedUntil).toBeNull();
      await signIn(agent);
      await expectEvent('users.unlocked', agent.id);
    });

    it('impide autodesactivación, cambio del propio rol y autorrestablecimiento', async () => {
      const cases = [
        ['post', `/api/users/${admin.id}/deactivate`, {}, 'SELF_DEACTIVATION'],
        ['patch', `/api/users/${admin.id}`, { roleCode: 'agente' }, 'SELF_ROLE_CHANGE'],
        ['post', `/api/users/${admin.id}/reset-password`, {}, 'SELF_PASSWORD_RESET'],
      ] as const;
      for (const [method, path, body, code] of cases) {
        const response = await call(method, path, body);
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe(code);
      }
    });

    it('no permite retirar al último administrador permanente; otro temporal, inactivo, vencido o directory no lo sustituye', async () => {
      const temporary = await fixture('administrador');
      await pool.query(
        "UPDATE users SET is_temporary = true, expires_at = clock_timestamp() + interval '7 days' WHERE id = $1",
        [temporary.id],
      );
      const cookie = await signIn(temporary);
      const inactive = await fixture('administrador');
      await pool.query('UPDATE users SET is_active = false WHERE id = $1', [inactive.id]);
      const expired = await fixture('administrador');
      await pool.query(
        "UPDATE users SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1",
        [expired.id],
      );
      const directory = await create({ authProvider: 'directory', roleCode: 'administrador' });
      expect(directory.status).toBe(201);
      for (const [method, path, body] of [
        ['post', `/api/users/${admin.id}/deactivate`, {}],
        ['patch', `/api/users/${admin.id}`, { roleCode: 'agente' }],
        [
          'patch',
          `/api/users/${admin.id}`,
          { expiresAt: new Date(Date.now() + 86400000).toISOString() },
        ],
      ] as const) {
        const response = await call(method, path, body, cookie);
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('LAST_ADMINISTRATOR');
      }
      const replacement = await fixture('administrador');
      expect(
        (await call('post', `/api/users/${admin.id}/deactivate`, {}, await signIn(replacement)))
          .status,
      ).toBe(200);
    });

    it('dos cambios simultáneos no pueden dejar únicamente administradores que vencerán', async () => {
      const other = await fixture('administrador');
      const cookie = await signIn(other);
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const responses = await Promise.all([
        call('patch', `/api/users/${admin.id}`, { expiresAt }),
        call('patch', `/api/users/${other.id}`, { expiresAt }, cookie),
      ]);
      expect(responses.map((result) => result.status).sort()).toEqual([200, 409]);
    });

    it('los cambios de rol se aplican en la siguiente petición y se auditan', async () => {
      expect(
        (await call('patch', `/api/users/${agent.id}`, { roleCode: 'administrador' })).status,
      ).toBe(200);
      expect((await call('get', '/api/users', undefined, agentCookie)).status).toBe(200);
      expect(
        (
          await call('patch', `/api/users/${agent.id}`, {
            roleCode: 'supervisor',
            fullName: 'Nombre cambiado',
            notes: 'Motivo de prueba',
          })
        ).status,
      ).toBe(200);
      expect((await call('get', '/api/users', undefined, agentCookie)).status).toBe(403);
      await expectEvent('users.role_changed', agent.id);
      await expectEvent('users.updated', agent.id);
    });

    it('lista con paginación, todos los filtros y búsqueda literal por correo o nombre', async () => {
      const mark = randomUUID();
      const first = await create({ fullName: `${mark} Uno`, temporary: true });
      const second = await create({ fullName: `${mark} Dos`, authProvider: 'directory' });
      await call('post', `/api/users/${second.body.id}/deactivate`);
      const list = await call('get', `/api/users?q=${mark}&pageSize=1&page=1`);
      expect(list.status).toBe(200);
      expect(list.body.total).toBe(2);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.pageSize).toBe(1);
      expect((await call('get', `/api/users?q=${mark}&pageSize=1&page=3`)).body).toMatchObject({
        data: [],
        total: 2,
        page: 3,
      });
      for (const filter of [
        'role=solicitante&provider=local&active=true&temporary=true&expired=false',
        'provider=directory&active=false&temporary=false',
      ]) {
        expect((await call('get', `/api/users?q=${mark}&${filter}`)).body.total).toBe(1);
      }
      await pool.query(
        "UPDATE users SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1",
        [first.body.id],
      );
      expect((await call('get', `/api/users?q=${mark}&expired=true`)).body.total).toBe(1);
      expect(
        (await call('get', `/api/users?q=${encodeURIComponent(first.body.email)}`)).body.total,
      ).toBe(1);
      expect((await call('get', '/api/users?q=%25')).body.total).toBe(0);
      for (const query of ['page=0', 'pageSize=101', 'active=1', 'provider=otro', 'role=auditor']) {
        expect((await call('get', `/api/users?${query}`)).status).toBe(400);
      }
      expect(JSON.stringify(list.body).includes('password_hash')).toBe(false);
    });

    it('categorías: cualquier rol autenticado puede leer; solo el administrador incluye inactivas', async () => {
      const created = await category();
      expect((await call('get', '/api/categories', undefined, null)).status).toBe(401);
      for (const role of ['solicitante', 'agente', 'supervisor', 'administrador']) {
        const account = await fixture(role);
        const response = await call('get', '/api/categories', undefined, await signIn(account));
        expect(response.status).toBe(200);
        expect(response.body.data.some((row: { id: string }) => row.id === created.body.id)).toBe(
          true,
        );
      }
      expect(
        (await call('get', '/api/categories?includeInactive=true', undefined, agentCookie)).status,
      ).toBe(403);
      expect((await call('get', '/api/categories?includeInactive=true')).status).toBe(200);
    });

    it('categorías: duplicado sin mayúsculas, cambios, desactivación sin perder tickets y reactivación auditada', async () => {
      const created = await category({ description: 'Descripción de prueba' });
      expect(created.status).toBe(201);
      expect((await category({ name: created.body.name.toUpperCase() })).status).toBe(409);
      await pool.query(
        `INSERT INTO tickets (subject, description, category_id, requester_id)
      VALUES ('Ticket de prueba', 'Conservar su categoría', $1, $2)`,
        [created.body.id, agent.id],
      );
      const updated = await call('patch', `/api/categories/${created.body.id}`, {
        name: `Editada ${randomUUID()}`,
        description: null,
        isActive: false,
      });
      expect(updated.status).toBe(200);
      expect(updated.body.isActive).toBe(false);
      expect((await call('get', '/api/categories')).body.data).toHaveLength(0);
      expect((await call('get', '/api/categories?includeInactive=true')).body.data).toHaveLength(1);
      expect(
        (
          await pool.query('SELECT count(*)::int AS count FROM tickets WHERE category_id = $1', [
            created.body.id,
          ])
        ).rows[0].count,
      ).toBe(1);
      expect(
        (await call('patch', `/api/categories/${created.body.id}`, { isActive: true })).status,
      ).toBe(200);
      for (const action of [
        'categories.created',
        'categories.updated',
        'categories.deactivated',
        'categories.activated',
      ])
        await expectEvent(action, created.body.id, 'category');
      expect((await call('delete', `/api/categories/${created.body.id}`)).status).toBe(404);
      expect((await call('delete', `/api/users/${agent.id}`)).status).toBe(404);
    });

    it('valida categorías, IDs y objetivos inexistentes sin errores internos', async () => {
      for (const body of [
        { name: '' },
        { name: ' '.repeat(3) },
        { name: 'a'.repeat(81) },
        { isActive: 'false' },
      ])
        expect((await category(body)).status).toBe(400);
      expect((await call('get', '/api/users/no-es-id')).status).toBe(400);
      expect((await call('get', '/api/users/9223372036854775808')).status).toBe(400);
      expect((await call('get', '/api/users/9223372036854775807')).status).toBe(404);
      expect(
        (await call('patch', '/api/categories/9223372036854775807', { isActive: false })).status,
      ).toBe(404);
      expect((await call('patch', `/api/users/${agent.id}`, {})).status).toBe(400);
    });

    it('los metadatos guardan solo cambios estructurados y la IP, sin los textos libres', async () => {
      const marker = randomUUID();
      const created = await create({ notes: marker, fullName: marker });
      const events = await pool.query(
        'SELECT metadata, ip FROM audit_events WHERE target_type = $1 AND target_id = $2',
        ['user', created.body.id],
      );
      expect(events.rowCount).toBe(1);
      const data = JSON.stringify(events.rows);
      expect(data.includes(marker)).toBe(false);
      expect(data.includes(created.body.temporaryPassword)).toBe(false);
      expect(
        data.includes(createHash('sha256').update(created.body.temporaryPassword).digest('hex')),
      ).toBe(false);
      expect(events.rows[0].ip).not.toBeNull();
    });
  },
);
