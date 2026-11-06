import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
const url = process.env.DATABASE_URL?.trim();
if (!url)
  console.info(
    'SKIP: tickets requiere DATABASE_URL exportada; crea un esquema privado de pruebas.',
  );
describe.skipIf(!url)('núcleo de tickets con PostgreSQL real', () => {
  let setup: pg.Client, pool: pg.Pool, app: Express;
  const schema = `hd_tickets_${randomUUID().replaceAll('-', '')}`;
  const origin = 'http://localhost:4200';
  type Account = { id: string; cookie: string };
  let solicitante: Account, otro: Account, agente: Account, admin: Account, supervisor: Account;
  let category: string;
  let logs: unknown[][];
  let sensitive: string[];
  beforeAll(async () => {
    setup = new pg.Client({ connectionString: url });
    await setup.connect();
    await setup.query(`CREATE SCHEMA ${schema}`);
    await setup.query(`SET search_path TO ${schema},pg_catalog`);
    for (const m of await loadMigrations()) await setup.query(m.sql);
    const isolated = new URL(url!);
    isolated.searchParams.set('options', `-csearch_path=${schema},pg_catalog`);
    vi.stubEnv('DATABASE_URL', isolated.toString());
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('TELEGRAM_ALLOWED_USER_IDS', '');
    ({ pool } = await import('../../src/db/pool.js'));
    const { env } = await import('../../src/config/env.js');
    const { createApp } = await import('../../src/app.js');
    app = createApp({ ...env, nodeEnv: 'test', frontendOrigin: origin });
  });
  async function account(role: string): Promise<Account> {
    const secret = randomBytes(24).toString('hex');
    const hash = await hashPassword(secret);
    sensitive.push(secret, hash);
    const u = await pool.query<{ id: string }>(
      `INSERT INTO users(full_name,email,role_id,password_hash,must_change_password) VALUES('Empleado',$1,(SELECT id FROM roles WHERE code=$2),$3,false) RETURNING id::text`,
      [`${randomUUID()}@example.invalid`, role, hash],
    );
    const token = randomBytes(32).toString('base64url');
    sensitive.push(token);
    await pool.query(
      "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",
      [u.rows[0]!.id, createHash('sha256').update(token).digest('hex')],
    );
    return { id: u.rows[0]!.id, cookie: `hd_session=${token}` };
  }
  beforeEach(async () => {
    sensitive = [];
    logs = [];
    for (const name of ['info', 'log', 'warn', 'error'] as const)
      vi.spyOn(console, name).mockImplementation((...args) => logs.push(args));
    solicitante = await account('solicitante');
    otro = await account('solicitante');
    agente = await account('agente');
    admin = await account('administrador');
    supervisor = await account('supervisor');
    category = (
      await pool.query<{ id: string }>(
        "INSERT INTO categories(name) VALUES('Categoría de prueba') RETURNING id::text",
      )
    ).rows[0]!.id;
  });
  afterEach(async () => {
    try {
      for (const secret of sensitive) expect(JSON.stringify(logs)).not.toContain(secret);
    } finally {
      await pool.query('DELETE FROM audit_events');
      await pool.query('DELETE FROM tickets');
      await pool.query('DELETE FROM sessions');
      await pool.query('DELETE FROM users');
      await pool.query('DELETE FROM categories');
    }
  });
  afterAll(async () => {
    await pool?.end();
    await setup?.query(`DROP SCHEMA ${schema} CASCADE`);
    await setup?.end();
  });
  const create = (
    user: Account = solicitante,
    body: object = {
      subject: 'Impresora',
      description: 'Descripción segura',
      categoryId: category,
    },
  ) =>
    request(app).post('/api/tickets').set('Origin', origin).set('Cookie', user.cookie).send(body);
  const list = (user: Account = solicitante, query = '') =>
    request(app)
      .get(`/api/tickets${query ? '?' + query : ''}`)
      .set('Cookie', user.cookie);
  const detail = (id: string, user: Account = solicitante) =>
    request(app).get(`/api/tickets/${id}`).set('Cookie', user.cookie);
  it('exige sesión y contraseña definitiva en creación, listado y detalle', async () => {
    for (const [method, path] of [
      ['get', '/api/tickets'],
      ['get', '/api/tickets/1'],
      ['post', '/api/tickets'],
    ] as const) {
      const r = request(app)[method](path);
      if (method === 'post') r.set('Origin', origin).send({});
      expect((await r).status).toBe(401);
    }
    await pool.query('UPDATE users SET must_change_password=true WHERE id=$1', [solicitante.id]);
    expect((await list()).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await create()).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it.each([
    { subject: '' },
    { subject: '   ' },
    { subject: 'x'.repeat(161) },
    { description: '' },
    { description: '   ' },
    { description: 'x'.repeat(5001) },
    { categoryId: '' },
    { categoryId: '0' },
    { categoryId: '9223372036854775808' },
    { requesterId: '1' },
    { status: 'cerrado' },
    { assignedAgentId: '1' },
    { userId: '1' },
  ])('rechaza campos inválidos o controlados por sesión, caso %#', async (body) => {
    const r = await create(solicitante, {
      subject: 'Asunto',
      description: 'Texto',
      categoryId: category,
      ...body,
    });
    expect(r.status).toBe(400);
    expect((await pool.query('SELECT count(*)::int AS n FROM tickets')).rows[0].n).toBe(0);
  });
  it('valida categorías inexistentes e inactivas', async () => {
    expect(
      (
        await create(solicitante, {
          subject: 'Asunto',
          description: 'Texto',
          categoryId: '999999999',
        })
      ).body.error.code,
    ).toBe('INVALID_CATEGORY');
    await pool.query('UPDATE categories SET is_active=false WHERE id=$1', [category]);
    const r = await create();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CATEGORY_INACTIVE');
  });
  it.each(['solicitante', 'agente', 'supervisor', 'administrador'])(
    'cualquier rol crea para sí, con estado creado y sin agente: %s',
    async (role) => {
      const user = { solicitante, agente, supervisor, administrador: admin }[role]!;
      const r = await create(user, {
        subject: '  Impresora  ',
        description: '  Dos líneas\nSegunda  ',
        categoryId: category,
      });
      expect(r.status).toBe(201);
      expect(r.headers.location).toBe(`/api/tickets/${r.body.id}`);
      expect(r.body).toMatchObject({
        number: expect.stringMatching(/^HD-\d{6,}$/),
        subject: 'Impresora',
        description: 'Dos líneas\nSegunda',
        status: 'creado',
        assignedAgent: null,
        requester: { id: user.id },
        resolvedAt: null,
        closedAt: null,
        canceledAt: null,
      });
      expect(new Date(r.body.createdAt).toISOString()).toBe(r.body.createdAt);
      const event = (
        await pool.query(
          'SELECT actor_user_id::text,action,target_type,target_id::text,metadata FROM audit_events',
        )
      ).rows[0];
      expect(event).toEqual({
        actor_user_id: user.id,
        action: 'ticket.created',
        target_type: 'ticket',
        target_id: r.body.id,
        metadata: { ticketNumber: r.body.number, categoryId: category },
      });
      expect(JSON.stringify(event)).not.toContain('Dos líneas');
      expect(JSON.stringify(logs)).not.toContain('Dos líneas');
    },
  );
  it('el rollback de auditoría revierte también el ticket', async () => {
    await pool.query(
      "ALTER TABLE audit_events ADD CONSTRAINT reject_test_event CHECK(action <> 'ticket.created')",
    );
    try {
      expect((await create()).status).toBe(500);
      expect((await list()).body.total).toBe(0);
    } finally {
      await pool.query('ALTER TABLE audit_events DROP CONSTRAINT reject_test_event');
    }
  });
  it('números únicos bajo creaciones concurrentes', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => create()));
    expect(responses.every((r) => r.status === 201)).toBe(true);
    expect(new Set(responses.map((r) => r.body.number)).size).toBe(8);
  });
  it('solicitante solo ve sus tickets; otros roles ven todos y el detalle ajeno es 404', async () => {
    const own = await create();
    const foreign = await create(otro);
    expect((await list()).body.data.map((t: { id: string }) => t.id)).toEqual([own.body.id]);
    for (const user of [agente, supervisor, admin]) {
      expect((await list(user)).body.total).toBe(2);
      expect((await detail(foreign.body.id, user)).status).toBe(200);
    }
    expect((await detail(own.body.id)).status).toBe(200);
    expect((await detail(foreign.body.id)).status).toBe(404);
    expect((await detail('999999999')).status).toBe(404);
    expect((await list(solicitante, `requesterId=${otro.id}`)).status).toBe(400);
  });
  it('filtra, busca número/asunto, pagina y ordena incluso con fechas iguales', async () => {
    const first = await create(solicitante, {
      subject: 'Impresora %_',
      description: 'Texto',
      categoryId: category,
    });
    const second = await create(solicitante, {
      subject: 'Red de oficina',
      description: 'Texto',
      categoryId: category,
    });
    await pool.query(
      "UPDATE tickets SET status_id=(SELECT id FROM ticket_statuses WHERE code='en_espera') WHERE id=$1",
      [second.body.id],
    );
    for (const search of [first.body.number, first.body.number.slice(3), 'IMPRESORA', '%_']) {
      expect(
        (await list(solicitante, `search=${encodeURIComponent(search)}`)).body.data.map(
          (t: { id: string }) => t.id,
        ),
      ).toEqual([first.body.id]);
    }
    expect(
      (await list(solicitante, `status=en_espera&categoryId=${category}&search=oficina`)).body
        .total,
    ).toBe(1);
    for (let i = 0; i < 10; i++) await create();
    await pool.query("UPDATE tickets SET created_at='2026-01-01T00:00:00Z'");
    const page1 = (await list(solicitante, 'pageSize=10')).body;
    const page2 = (await list(solicitante, 'pageSize=10&page=2')).body;
    expect(page1.total).toBe(12);
    expect(page1.data).toHaveLength(10);
    expect(page2.data).toHaveLength(2);
    expect(BigInt(page1.data[0].id) > BigInt(page2.data[0].id)).toBe(true);
    expect((await list(solicitante, 'page=99')).body).toMatchObject({
      data: [],
      total: 12,
      page: 99,
    });
  });
  it.each([
    'page=0',
    'pageSize=100',
    'pageSize=abc',
    'status=asignado',
    'categoryId=0',
    'categoryId=1%20OR%201=1',
    'search=' + encodeURIComponent('x'.repeat(161)),
  ])('rechaza filtro inválido %s', async (query) =>
    expect((await list(solicitante, query)).status).toBe(400),
  );
  it('conserva categoría histórica inactiva y no ofrece cambios de estado ni asignación', async () => {
    const r = await create();
    await pool.query('UPDATE categories SET is_active=false WHERE id=$1', [category]);
    expect((await detail(r.body.id)).body.category.name).toBe('Categoría de prueba');
    expect((await list(solicitante, `categoryId=${category}`)).body.total).toBe(1);
    expect(
      (
        await request(app)
          .patch(`/api/tickets/${r.body.id}`)
          .set('Cookie', agente.cookie)
          .set('Origin', origin)
          .send({ status: 'en_proceso' })
      ).status,
    ).toBe(404);
  });
  it('PostgreSQL impone longitudes, claves y número completo mayor a seis dígitos', async () => {
    const r = await create();
    await expect(
      pool.query("UPDATE tickets SET subject=repeat('x',161) WHERE id=$1", [r.body.id]),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('UPDATE tickets SET category_id=999999999 WHERE id=$1', [r.body.id]),
    ).rejects.toMatchObject({ code: '23503' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const big = await client.query(
        "INSERT INTO tickets(id,subject,description,category_id,requester_id) OVERRIDING SYSTEM VALUE VALUES(1000001,'Grande','Texto',$1,$2) RETURNING reference",
        [category, solicitante.id],
      );
      expect(big.rows[0].reference).toBe('HD-1000001');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
