import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
import {
  TelegramNotificationsService,
  type SupportNotifier,
  type SupportEvent,
} from '../../src/integrations/telegram/support-group.js';
const url = process.env.DATABASE_URL?.trim();
if (!url)
  console.info('SKIP: notificaciones requiere DATABASE_URL exportada; usa un esquema privado.');
describe.skipIf(!url)('notificaciones transaccionales y API privada', () => {
  const schema = `hd_notifications_${randomUUID().replaceAll('-', '')}`,
    origin = 'http://localhost:4200';
  let setup: pg.Client,
    pool: pg.Pool,
    app: Express,
    config: Parameters<(typeof import('../../src/app.js'))['createApp']>[0];
  let createApp: (typeof import('../../src/app.js'))['createApp'];
  type Account = { id: string; cookie: string };
  let owner: Account, other: Account, a: Account, b: Account, admin: Account, category: string;
  let emitted: SupportEvent[], send: ReturnType<typeof vi.fn<SupportNotifier['notify']>>;
  let hash: string;
  beforeAll(async () => {
    setup = new pg.Client({ connectionString: url });
    await setup.connect();
    await setup.query(`CREATE SCHEMA ${schema}`);
    await setup.query(`SET search_path TO ${schema},pg_catalog`);
    for (const m of await loadMigrations()) await setup.query(m.sql);
    const isolated = new URL(url!);
    isolated.searchParams.set('options', `-csearch_path=${schema},pg_catalog`);
    vi.stubEnv('DATABASE_URL', isolated.toString());
    ({ pool } = await import('../../src/db/pool.js'));
    const { env } = await import('../../src/config/env.js');
    ({ createApp } = await import('../../src/app.js'));
    config = { ...env, nodeEnv: 'test', frontendOrigin: origin };
    hash = await hashPassword(randomBytes(24).toString('base64url'));
  });
  async function account(role: string): Promise<Account> {
    const id = (
      await pool.query<{ id: string }>(
        `INSERT INTO users(full_name,email,role_id,password_hash,must_change_password) VALUES($1,$2,(SELECT id FROM roles WHERE code=$3),$4,false) RETURNING id::text`,
        [role, `${randomUUID()}@example.invalid`, role, hash],
      )
    ).rows[0]!.id;
    const token = randomBytes(32).toString('base64url');
    await pool.query(
      "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",
      [id, createHash('sha256').update(token).digest('hex')],
    );
    return { id, cookie: `hd_session=${token}` };
  }
  beforeEach(async () => {
    owner = await account('solicitante');
    other = await account('solicitante');
    a = await account('agente');
    b = await account('agente');
    admin = await account('administrador');
    category = (
      await pool.query<{ id: string }>(
        "INSERT INTO categories(name) VALUES('Impresoras') RETURNING id::text",
      )
    ).rows[0]!.id;
    emitted = [];
    send = vi.fn(async (event) => {
      // Otra conexión solo puede observar el cambio después del commit.
      const stored = await setup.query('SELECT id FROM tickets WHERE reference=$1', [event.number]);
      expect(stored.rowCount).toBe(1);
      emitted.push(event);
    });
    app = createApp(config, undefined, { notify: send });
  });
  afterEach(async () => {
    for (const table of [
      'notifications',
      'audit_events',
      'ticket_events',
      'ticket_notes',
      'ticket_attachments',
      'tickets',
      'sessions',
      'users',
      'categories',
    ])
      await pool.query(`DELETE FROM ${table}`);
  });
  afterAll(async () => {
    await pool?.end();
    await setup?.query(`DROP SCHEMA ${schema} CASCADE`);
    await setup?.end();
  });
  const create = (user = owner) =>
    request(app).post('/api/tickets').set('Origin', origin).set('Cookie', user.cookie).send({
      subject: 'ASUNTO_PRIVADO',
      description: 'DESCRIPCION_PRIVADA',
      categoryId: category,
    });
  const assignment = (id: string, agentId: string | null, user = admin) =>
    request(app)
      .patch(`/api/tickets/${id}/assignment`)
      .set('Origin', origin)
      .set('Cookie', user.cookie)
      .send({ agentId });
  const transition = (id: string, action: string, user: Account) =>
    request(app)
      .post(`/api/tickets/${id}/transitions`)
      .set('Origin', origin)
      .set('Cookie', user.cookie)
      .send({ action });
  const priority = (id: string, value: string, user = admin) =>
    request(app)
      .patch(`/api/tickets/${id}/priority`)
      .set('Origin', origin)
      .set('Cookie', user.cookie)
      .send({ priority: value });
  const get = (path: string, user = owner) =>
    request(app).get(`/api/notifications${path}`).set('Cookie', user.cookie);
  const patch = (id: string, user = owner) =>
    request(app)
      .patch(`/api/notifications/${id}/read`)
      .set('Origin', origin)
      .set('Cookie', user.cookie)
      .send({});
  const all = (user = owner) =>
    request(app)
      .post('/api/notifications/read-all')
      .set('Origin', origin)
      .set('Cookie', user.cookie)
      .send({});
  const notifications = async () =>
    (
      await pool.query(
        'SELECT user_id::text,type,ticket_id::text,read_at FROM notifications ORDER BY id',
      )
    ).rows;
  it('creación solo avisa al grupo y asignación/reasignación al destinatario nuevo, sin duplicar', async () => {
    const ticket = (await create()).body;
    expect(await notifications()).toEqual([]);
    expect(emitted).toEqual([
      { type: 'created', number: ticket.number, category: 'Impresoras', priority: 'media' },
    ]);
    expect((await assignment(ticket.id, a.id)).status).toBe(200);
    expect((await assignment(ticket.id, a.id)).status).toBe(409);
    expect((await assignment(ticket.id, b.id)).status).toBe(200);
    expect(await notifications()).toEqual([
      { user_id: a.id, type: 'ticket_assigned', ticket_id: ticket.id, read_at: null },
      { user_id: b.id, type: 'ticket_reassigned', ticket_id: ticket.id, read_at: null },
    ]);
    expect(emitted.slice(1)).toEqual([
      { type: 'assigned', number: ticket.number, agent: 'agente' },
      { type: 'reassigned', number: ticket.number, fromAgent: 'agente', agent: 'agente' },
    ]);
    await assignment(ticket.id, null);
    expect(emitted).toHaveLength(3);
    expect(await notifications()).toHaveLength(2);
  });
  it('espera/resuelto al propietario; reapertura/cierre al agente; ninguna transición va al grupo', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id);
    send.mockClear();
    emitted = [];
    expect((await transition(ticket.id, 'start', a)).status).toBe(200);
    expect((await transition(ticket.id, 'wait', a)).status).toBe(200);
    expect((await transition(ticket.id, 'resume', a)).status).toBe(200);
    await transition(ticket.id, 'resolve', a);
    await transition(ticket.id, 'reopen', owner);
    await transition(ticket.id, 'resolve', a);
    await transition(ticket.id, 'close', owner);
    expect((await notifications()).map((n) => [n.type, n.user_id])).toEqual([
      ['ticket_assigned', a.id],
      ['ticket_started', owner.id],
      ['ticket_waiting', owner.id],
      ['ticket_resolved', owner.id],
      ['ticket_reopened', a.id],
      ['ticket_resolved', owner.id],
      ['ticket_closed', a.id],
    ]);
    expect(send).not.toHaveBeenCalled();
  });
  it('start notifica solo al propietario con texto/número correctos, sin duplicados concurrentes ni Telegram', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id);
    await pool.query('DELETE FROM notifications');
    send.mockClear();
    const results = await Promise.all([
      transition(ticket.id, 'start', a),
      transition(ticket.id, 'start', a),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await notifications()).toEqual([
      { user_id: owner.id, type: 'ticket_started', ticket_id: ticket.id, read_at: null },
    ]);
    const page = (await get('')).body;
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      type: 'ticket_started',
      title: 'Tu ticket está siendo atendido',
      message: `Tu ticket ${ticket.number} ahora está en proceso.`,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      readAt: null,
    });
    expect((await get('/unread-count')).body.count).toBe(1);
    for (const user of [other, a, b, admin]) {
      expect((await get('/unread-count', user)).body.count).toBe(0);
      expect((await get('', user)).body.items).toEqual([]);
    }
    expect(send).not.toHaveBeenCalled();
  });
  it('start evita auto-notificación cuando el agente atiende su propio ticket', async () => {
    const ticket = (await create(a)).body;
    await assignment(ticket.id, a.id);
    const before = await notifications();
    send.mockClear();
    expect((await transition(ticket.id, 'start', a)).status).toBe(200);
    expect(await notifications()).toEqual(before);
    expect((await notifications()).some((n) => n.type === 'ticket_started')).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('fallo de ticket_started revierte estado, fecha, evento y auditoría sin enviar Telegram', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id);
    const snapshot = async () =>
      (
        await pool.query(
          'SELECT status_id,updated_at,resolved_at,closed_at,canceled_at FROM tickets WHERE id=$1',
          [ticket.id],
        )
      ).rows[0];
    const before = await snapshot(),
      beforeNotifications = await notifications();
    send.mockClear();
    await pool.query(
      "ALTER TABLE notifications ADD CONSTRAINT reject_started CHECK(type <> 'ticket_started')",
    );
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await transition(ticket.id, 'start', a)).status).toBe(500);
      expect(await snapshot()).toEqual(before);
      expect(await notifications()).toEqual(beforeNotifications);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM ticket_events WHERE ticket_id=$1 AND event_type='status_changed'",
            [ticket.id],
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM audit_events WHERE target_id=$1 AND action='ticket.status_changed'",
            [ticket.id],
          )
        ).rows[0].n,
      ).toBe(0);
      expect(send).not.toHaveBeenCalled();
    } finally {
      await pool.query('ALTER TABLE notifications DROP CONSTRAINT reject_started');
    }
  });
  it('solo urgente avisa, y evita auto-notificaciones en prioridad y asignación', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id, a);
    expect(await notifications()).toHaveLength(0);
    await priority(ticket.id, 'alta');
    expect(await notifications()).toHaveLength(0);
    await priority(ticket.id, 'urgente');
    expect(await notifications()).toHaveLength(1);
    expect((await notifications())[0]).toMatchObject({ type: 'priority_changed', user_id: a.id });
    expect((await priority(ticket.id, 'urgente')).status).toBe(409);
    expect(emitted.filter((e) => e.type === 'urgent')).toHaveLength(1);
    await priority(ticket.id, 'media', a);
    await priority(ticket.id, 'urgente', a);
    expect(await notifications()).toHaveLength(1);
    expect(emitted.filter((e) => e.type === 'urgent')).toHaveLength(2);
  });
  it('cancelación, notas y contacto directo no producen avisos adicionales', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id);
    send.mockClear();
    const before = await notifications();
    expect(
      (
        await request(app)
          .post(`/api/tickets/${ticket.id}/notes`)
          .set('Origin', origin)
          .set('Cookie', a.cookie)
          .send({ body: 'NOTA_PRIVADA' })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .get(`/api/tickets/${ticket.id}/telegram-contact`)
          .set('Cookie', owner.cookie)
      ).status,
    ).toBe(200);
    expect((await transition(ticket.id, 'cancel', owner)).status).toBe(200);
    expect(await notifications()).toEqual(before);
    expect(send).not.toHaveBeenCalled();
  });
  it('count/listado/paginación/unreadOnly y lectura idempotente son privados', async () => {
    const ticket = (await create()).body;
    await assignment(ticket.id, a.id);
    await transition(ticket.id, 'start', a);
    await transition(ticket.id, 'wait', a);
    await transition(ticket.id, 'resolve', a);
    expect((await get('/unread-count')).body).toEqual({ count: 3 });
    const page = (await get('?page=1&pageSize=1')).body;
    expect(page.pagination).toEqual({ page: 1, pageSize: 1, total: 3 });
    expect(page.items[0]).toMatchObject({
      type: 'ticket_resolved',
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      readAt: null,
    });
    expect(Object.keys(page.items[0]).sort()).toEqual(
      ['id', 'type', 'title', 'message', 'ticketId', 'ticketNumber', 'readAt', 'createdAt'].sort(),
    );
    const id = page.items[0].id;
    expect((await patch(id, other)).status).toBe(404);
    expect((await get('', other)).body.items).toEqual([]);
    expect((await patch(id)).status).toBe(204);
    const readAt = (await pool.query('SELECT read_at FROM notifications WHERE id=$1', [id])).rows[0]
      .read_at;
    expect((await patch(id)).status).toBe(204);
    expect(
      (await pool.query('SELECT read_at FROM notifications WHERE id=$1', [id])).rows[0].read_at,
    ).toEqual(readAt);
    expect((await get('/unread-count')).body.count).toBe(2);
    expect((await get('?unreadOnly=true')).body.items).toHaveLength(2);
    expect((await get('?page=2&pageSize=1')).body.items).toHaveLength(1);
    expect((await all()).status).toBe(204);
    expect((await all()).status).toBe(204);
    expect((await get('/unread-count')).body.count).toBe(0);
    expect((await get('/unread-count', a)).body.count).toBe(1);
  });
  it('exige sesión, CSRF, contraseña definitiva y valida queries/bodies sin aceptar userId', async () => {
    for (const [method, path] of [
      ['get', ''],
      ['get', '/unread-count'],
      ['patch', '/1/read'],
      ['post', '/read-all'],
    ] as const) {
      const r = request(app)[method]('/api/notifications' + path);
      if (method !== 'get') r.set('Origin', origin).send({});
      expect((await r).status).toBe(401);
    }
    for (const query of ['?page=0', '?pageSize=101', '?unreadOnly=yes', `?userId=${other.id}`])
      expect((await get(query)).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/notifications/read-all')
          .set('Cookie', owner.cookie)
          .set('Origin', origin)
          .send({ userId: other.id })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).post('/api/notifications/read-all').set('Cookie', owner.cookie).send({}))
        .status,
    ).toBe(403);
    await pool.query('UPDATE users SET must_change_password=true WHERE id=$1', [owner.id]);
    expect((await get('')).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it('fallo de notification hace rollback de asignación/evento/auditoría y no envía al grupo', async () => {
    const ticket = (await create()).body;
    send.mockClear();
    await pool.query(
      "ALTER TABLE notifications ADD CONSTRAINT reject_notification CHECK(type <> 'ticket_assigned')",
    );
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await assignment(ticket.id, a.id)).status).toBe(500);
      expect(
        (await pool.query('SELECT assigned_agent_id FROM tickets WHERE id=$1', [ticket.id])).rows[0]
          .assigned_agent_id,
      ).toBeNull();
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM ticket_events WHERE event_type='assigned'",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM audit_events WHERE action='ticket.assigned'",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(await notifications()).toHaveLength(0);
      expect(send).not.toHaveBeenCalled();
    } finally {
      await pool.query('ALTER TABLE notifications DROP CONSTRAINT reject_notification');
    }
  });
  it('fallo de auditoría revierte también la notificación y jamás publica asignación', async () => {
    const ticket = (await create()).body;
    send.mockClear();
    await pool.query(
      "ALTER TABLE audit_events ADD CONSTRAINT reject_assignment CHECK(action <> 'ticket.assigned')",
    );
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await assignment(ticket.id, a.id)).status).toBe(500);
      expect(await notifications()).toHaveLength(0);
      expect(send).not.toHaveBeenCalled();
    } finally {
      await pool.query('ALTER TABLE audit_events DROP CONSTRAINT reject_assignment');
    }
  });
  it('error/red/timeout Telegram deja creación, asignación y urgente exitosos y sin secretos en logs', async () => {
    const token = `${123456789}:${'x'.repeat(35)}`,
      log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(`URL_PRIVADA_${token}`));
    app = createApp(
      config,
      undefined,
      new TelegramNotificationsService({ token, supportChatId: '-1001234567890' }, fetcher),
    );
    const created = await create();
    expect(created.status).toBe(201);
    expect((await assignment(created.body.id, a.id)).status).toBe(200);
    expect((await priority(created.body.id, 'urgente')).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(await notifications()).toHaveLength(2);
    expect(log).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(JSON.stringify(log.mock.calls)).not.toContain('URL_PRIVADA');
  });
  it('la migración añade índices y FK restrictivas y rechaza tipos abiertos', async () => {
    const indexes = (
      await pool.query('SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename=$2', [
        schema,
        'notifications',
      ])
    ).rows;
    expect(indexes.some((i) => i.indexdef.includes('WHERE (read_at IS NULL)'))).toBe(true);
    expect(indexes.some((i) => i.indexdef.includes('created_at DESC'))).toBe(true);
    await expect(
      pool.query(
        "INSERT INTO notifications(user_id,type,title,message) VALUES($1,'invalido','Título','Texto')",
        [owner.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "INSERT INTO notifications(user_id,type,title,message) VALUES(999999999,'ticket_closed','Título','Texto')",
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
