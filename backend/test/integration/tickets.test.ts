import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
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
  let solicitante: Account,
    otro: Account,
    agente: Account,
    agente2: Account,
    admin: Account,
    supervisor: Account;
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
    agente2 = await account('agente');
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
      await pool.query('DELETE FROM notifications');
      await pool.query('DELETE FROM ticket_events');
      await pool.query('DELETE FROM ticket_notes');
      await pool.query('DELETE FROM ticket_attachments');
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
      expect(r.body.priority).toBe('media');
      expect((await list(user)).body.data[0].number).toBe(r.body.number);
      expect((await detail(r.body.id, user)).body.number).toBe(r.body.number);
      expect(r.headers.location).toBe(`/api/tickets/${r.body.id}`);
      expect(r.body).toMatchObject({
        number: expect.stringMatching(/^TK-\d{6,}$/),
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
    for (const search of [
      first.body.number,
      first.body.number.slice(3),
      first.body.id,
      'IMPRESORA',
      '%_',
    ]) {
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
  it('conserva categoría histórica inactiva y rechaza escritura arbitraria de estado', async () => {
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
      expect(big.rows[0].reference).toBe('TK-1000001');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  const assign = (id: string, to: string | null, actor: Account = admin) =>
    request(app)
      .patch(`/api/tickets/${id}/assignment`)
      .set('Cookie', actor.cookie)
      .set('Origin', origin)
      .send({ agentId: to });
  const transition = (id: string, action: string, actor: Account = agente) =>
    request(app)
      .post(`/api/tickets/${id}/transitions`)
      .set('Cookie', actor.cookie)
      .set('Origin', origin)
      .send({ action });
  const events = (id: string, actor: Account = solicitante, query = '') =>
    request(app).get(`/api/tickets/${id}/events${query}`).set('Cookie', actor.cookie);
  async function state(
    status: string = 'creado',
    assigned: string | null = agente.id,
    owner: Account = solicitante,
  ) {
    const t = (await create(owner)).body;
    await pool.query(
      `UPDATE tickets SET status_id=(SELECT id FROM ticket_statuses WHERE code=$2),assigned_agent_id=$3,
      resolved_at=CASE WHEN $2 IN ('resuelto','cerrado') THEN now() ELSE NULL END,
      closed_at=CASE WHEN $2='cerrado' THEN now() ELSE NULL END,canceled_at=CASE WHEN $2='cancelado' THEN now() ELSE NULL END WHERE id=$1`,
      [t.id, status, assigned],
    );
    return (await detail(t.id, owner)).body;
  }
  it('protege los cuatro endpoints nuevos con sesión y contraseña definitiva', async () => {
    const t = (await create()).body;
    for (const [method, path] of [
      ['get', '/api/tickets/assignable-agents'],
      ['get', `/api/tickets/${t.id}/events`],
      ['patch', `/api/tickets/${t.id}/assignment`],
      ['post', `/api/tickets/${t.id}/transitions`],
    ] as const) {
      const req = request(app)[method](path);
      if (method !== 'get') req.set('Origin', origin).send({});
      expect((await req).status).toBe(401);
    }
    await pool.query('UPDATE users SET must_change_password=true WHERE id=$1', [admin.id]);
    expect((await assign(t.id, agente.id)).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await events(t.id, admin)).status).toBe(403);
  });
  it('solicitante ajeno recibe 404 tanto en actividad como en mutaciones', async () => {
    const t = await state();
    expect((await events(t.id, otro)).status).toBe(404);
    expect((await assign(t.id, agente.id, otro)).status).toBe(404);
    expect((await transition(t.id, 'cancel', otro)).status).toBe(404);
    expect((await assign(t.id, agente.id, solicitante)).status).toBe(403);
  });
  it('agente solo se asigna tickets libres, sin cambiar estado y sin duplicar eventos', async () => {
    const t = (await create()).body;
    expect((await assign(t.id, agente2.id, agente)).status).toBe(403);
    const r = await assign(t.id, agente.id, agente);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('creado');
    expect(r.body.assignedAgent.id).toBe(agente.id);
    expect((await assign(t.id, agente.id, agente)).body.error.code).toBe(
      'TICKET_ASSIGNMENT_UNCHANGED',
    );
    expect((await assign(t.id, agente2.id, agente2)).body.error.code).toBe(
      'TICKET_ALREADY_ASSIGNED',
    );
    expect((await assign(t.id, null, agente)).status).toBe(403);
    expect((await assign(t.id, agente2.id, agente)).status).toBe(403);
    const history = (await events(t.id)).body.data;
    expect(history.map((e: { type: string }) => e.type)).toEqual(['assigned', 'created']);
    expect(history[0]).toMatchObject({
      actor: { id: agente.id },
      fromAgent: null,
      toAgent: { id: agente.id },
      fromStatus: null,
      toStatus: null,
    });
  });
  it.each(['supervisor', 'administrador'])(
    '%s asigna, reasigna y desasigna con historia y auditoría',
    async (role) => {
      const actor = role === 'supervisor' ? supervisor : admin;
      const t = (await create()).body;
      expect((await assign(t.id, agente.id, actor)).status).toBe(200);
      expect((await assign(t.id, agente.id, actor)).body.error.code).toBe(
        'TICKET_ASSIGNMENT_UNCHANGED',
      );
      expect((await assign(t.id, agente2.id, actor)).status).toBe(200);
      const r = await assign(t.id, null, actor);
      expect(r.status).toBe(200);
      expect(r.body.assignedAgent).toBeNull();
      const data = (await events(t.id)).body.data;
      expect(data.map((e: { type: string }) => e.type)).toEqual([
        'unassigned',
        'reassigned',
        'assigned',
        'created',
      ]);
      expect(data[1]).toMatchObject({
        actor: { id: actor.id },
        fromAgent: { id: agente.id },
        toAgent: { id: agente2.id },
      });
      const audit = (
        await pool.query(
          'SELECT action,metadata FROM audit_events WHERE target_id=$1 ORDER BY id',
          [t.id],
        )
      ).rows;
      expect(audit.map((r) => r.action)).toEqual([
        'ticket.created',
        'ticket.assigned',
        'ticket.reassigned',
        'ticket.unassigned',
      ]);
      expect(audit[2].metadata).toEqual({ fromAgentId: agente.id, toAgentId: agente2.id });
    },
  );
  it('lista mínima de agentes válidos; bloqueo de login no afecta asignabilidad', async () => {
    await pool.query("UPDATE users SET locked_until=now()+interval '1 day' WHERE id=$1", [
      agente.id,
    ]);
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [agente2.id]);
    for (const actor of [admin, supervisor]) {
      const r = await request(app)
        .get('/api/tickets/assignable-agents')
        .set('Cookie', actor.cookie);
      expect(r.status).toBe(200);
      expect(r.body).toEqual([{ id: agente.id, fullName: 'Empleado', email: expect.any(String) }]);
      expect(Object.keys(r.body[0]).sort()).toEqual(['email', 'fullName', 'id']);
    }
    for (const actor of [agente, solicitante])
      expect(
        (await request(app).get('/api/tickets/assignable-agents').set('Cookie', actor.cookie))
          .status,
      ).toBe(403);
    const t = (await create()).body;
    expect((await assign(t.id, agente.id)).status).toBe(200);
    for (const id of [admin.id, supervisor.id, solicitante.id, agente2.id, '999999999'])
      expect((await assign(t.id, id)).body.error.code).toBe('AGENT_NOT_ASSIGNABLE');
    await pool.query(
      "UPDATE users SET is_active=true,expires_at=now()-interval '1 minute' WHERE id=$1",
      [agente2.id],
    );
    expect((await assign(t.id, agente2.id)).body.error.code).toBe('AGENT_NOT_ASSIGNABLE');
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [agente.id]);
    expect((await detail(t.id)).body.assignedAgent.id).toBe(agente.id);
    expect((await assign(t.id, null)).status).toBe(200);
  });
  it.each(['resuelto', 'cerrado', 'cancelado'])('no cambia asignación desde %s', async (status) => {
    const t = await state(status);
    for (const actor of [admin, supervisor, agente2])
      expect((await assign(t.id, agente2.id, actor)).status).toBe(409);
  });
  it('dos agentes concurrentes: solo uno se asigna y se registra un único cambio', async () => {
    const t = (await create()).body;
    const result = await Promise.all([
      assign(t.id, agente.id, agente),
      assign(t.id, agente2.id, agente2),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(result.find((r) => r.status === 409)!.body.error.code).toBe('TICKET_ALREADY_ASSIGNED');
    expect((await events(t.id)).body.total).toBe(2);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_events WHERE action='ticket.assigned'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  const validTransitions = [
    ['creado', 'start', 'en_proceso'],
    ['creado', 'cancel', 'cancelado'],
    ['en_proceso', 'wait', 'en_espera'],
    ['en_proceso', 'resolve', 'resuelto'],
    ['en_espera', 'resume', 'en_proceso'],
    ['en_espera', 'resolve', 'resuelto'],
    ['en_espera', 'cancel', 'cancelado'],
    ['resuelto', 'reopen', 'en_proceso'],
    ['resuelto', 'close', 'cerrado'],
  ] as const;
  it.each(validTransitions)(
    '%s con %s termina en %s y registra actor/antes/después',
    async (from, action, to) => {
      const t = await state(from);
      const actor = ['cancel', 'reopen', 'close'].includes(action) ? solicitante : agente;
      const r = await transition(t.id, action, actor);
      expect(r.status).toBe(200);
      expect(r.body.status).toBe(to);
      expect(r.body.assignedAgent.id).toBe(agente.id);
      expect(r.body.createdAt).toBe(t.createdAt);
      expect(new Date(r.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(t.updatedAt).getTime(),
      );
      if (to === 'resuelto') {
        expect(r.body.resolvedAt).not.toBeNull();
        expect(r.body.closedAt).toBeNull();
      }
      if (action === 'reopen') expect(r.body.resolvedAt).toBeNull();
      if (to === 'cerrado') {
        expect(r.body.resolvedAt).toBe(t.resolvedAt);
        expect(r.body.closedAt).not.toBeNull();
      }
      if (to === 'cancelado') {
        expect(r.body.canceledAt).not.toBeNull();
        expect(r.body.resolvedAt).toBeNull();
        expect(r.body.closedAt).toBeNull();
      }
      expect((await events(t.id)).body.data[0]).toMatchObject({
        type: 'status_changed',
        actor: { id: actor.id },
        fromStatus: from,
        toStatus: to,
      });
      expect(
        (await pool.query("SELECT metadata FROM audit_events WHERE action='ticket.status_changed'"))
          .rows[0].metadata,
      ).toEqual({ fromStatus: from, toStatus: to });
    },
  );
  it.each(['start', 'wait', 'resume', 'resolve'])(
    '%s exige agente incluso al supervisor',
    async (action) => {
      const from = {
        start: 'creado',
        wait: 'en_proceso',
        resume: 'en_espera',
        resolve: 'en_proceso',
      }[action]!;
      const t = await state(from, null);
      expect((await transition(t.id, action, supervisor)).body.error.code).toBe(
        'TICKET_AGENT_REQUIRED',
      );
    },
  );
  it.each(['start', 'wait', 'resume', 'resolve'])(
    'otro agente no puede %s y supervisor/admin sí',
    async (action) => {
      const from = {
        start: 'creado',
        wait: 'en_proceso',
        resume: 'en_espera',
        resolve: 'en_proceso',
      }[action]!;
      for (const actor of [supervisor, admin]) {
        const t = await state(from);
        expect((await transition(t.id, action, agente2)).status).toBe(403);
        expect((await transition(t.id, action, actor)).status).toBe(200);
      }
    },
  );
  it.each(['close', 'reopen', 'cancel'])(
    '%s distingue propietario del agente asignado, incluso si propietario es agente',
    async (action) => {
      const from = action === 'cancel' ? 'creado' : 'resuelto';
      const t = await state(from, agente.id, agente2);
      expect((await transition(t.id, action, agente)).status).toBe(403);
      expect((await transition(t.id, action, agente2)).status).toBe(200);
      for (const actor of [supervisor, admin]) {
        const other = await state(from);
        expect((await transition(other.id, action, actor)).status).toBe(200);
      }
      const owned = await state('en_proceso', agente.id, agente2);
      expect((await transition(owned.id, 'resolve', agente2)).status).toBe(403);
    },
  );
  it.each(['creado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado', 'cancelado'])(
    'rechaza todas las acciones incompatibles con %s',
    async (from) => {
      const t = await state(from);
      for (const action of ['start', 'wait', 'resume', 'resolve', 'reopen', 'close', 'cancel']) {
        if (validTransitions.some(([f, a]) => f === from && a === action)) continue;
        expect((await transition(t.id, action, admin)).status).toBe(409);
      }
      expect((await events(t.id)).body.total).toBe(1);
    },
  );
  it('transiciones concurrentes no producen historial duplicado', async () => {
    const t = await state('creado');
    const r = await Promise.all([transition(t.id, 'start'), transition(t.id, 'start')]);
    expect(r.map((v) => v.status).sort()).toEqual([200, 409]);
    expect((await events(t.id)).body.total).toBe(2);
  });
  it.each(['activity', 'audit'])(
    'si falla %s, revierte asignación y estado junto con ambos registros',
    async (kind) => {
      const t = (await create()).body;
      const table = kind === 'activity' ? 'ticket_events' : 'audit_events';
      const constraint = kind === 'activity' ? "event_type='created'" : "action='ticket.created'";
      await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT reject_mutation CHECK(${constraint})`);
      try {
        expect((await assign(t.id, agente.id)).status).toBe(500);
        expect((await detail(t.id)).body.assignedAgent).toBeNull();
        await pool.query('UPDATE tickets SET assigned_agent_id=$2 WHERE id=$1', [t.id, agente.id]);
        expect((await transition(t.id, 'start')).status).toBe(500);
        expect((await detail(t.id)).body.status).toBe('creado');
        expect((await events(t.id)).body.total).toBe(1);
        expect((await pool.query('SELECT count(*)::int AS n FROM audit_events')).rows[0].n).toBe(1);
      } finally {
        await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT reject_mutation`);
      }
    },
  );
  it('actividad paginada, ordenada, mínima y autorizada como el detalle', async () => {
    const t = (await create()).body;
    await assign(t.id, agente.id);
    await transition(t.id, 'start');
    await transition(t.id, 'resolve');
    const a = (await events(t.id, solicitante, '?page=1&pageSize=2')).body;
    const b = (await events(t.id, solicitante, '?page=2&pageSize=2')).body;
    expect(a).toMatchObject({ total: 4, page: 1, pageSize: 2 });
    expect(a.data).toHaveLength(2);
    expect(b.data).toHaveLength(2);
    expect(a.data[0].toStatus).toBe('resuelto');
    expect(b.data[1].type).toBe('created');
    expect(Object.keys(a.data[0].actor).sort()).toEqual(['fullName', 'id', 'role']);
    for (const actor of [agente, supervisor, admin])
      expect((await events(t.id, actor)).status).toBe(200);
    for (const query of ['?page=0', '?pageSize=101', '?actorId=1'])
      expect((await events(t.id, admin, query)).status).toBe(400);
  });
  it('rechaza campos de autoridad, acciones inválidas, cuerpos no JSON y origen distinto', async () => {
    const t = await state();
    for (const body of [
      { action: 'start', actorId: admin.id },
      { targetStatus: 'cerrado' },
      { action: 'start', fromStatus: 'creado' },
      { action: 'destroy' },
    ]) {
      expect(
        (
          await request(app)
            .post(`/api/tickets/${t.id}/transitions`)
            .set('Cookie', admin.cookie)
            .set('Origin', origin)
            .send(body)
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(app)
          .patch(`/api/tickets/${t.id}/assignment`)
          .set('Cookie', admin.cookie)
          .set('Origin', origin)
          .send({ agentId: agente.id, role: 'administrador' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/tickets/${t.id}/transitions`)
          .set('Cookie', admin.cookie)
          .set('Origin', 'http://otro.invalid')
          .send({ action: 'start' })
      ).status,
    ).toBe(403);
  });

  it('seed desde vacío ofrece siete escenarios y cronologías válidas, sin duplicar al repetir', async () => {
    const sql = await readFile(new URL('../../db/seeds/dev.sql', import.meta.url), 'utf8');
    const client = await pool.connect();
    try {
      const hash = await hashPassword(randomBytes(24).toString('hex'));
      for (let i = 0; i < 2; i++) {
        await client.query('BEGIN');
        await client.query("SELECT set_config('helpdesk.seed_password_hash',$1,true)", [hash]);
        await client.query(sql);
        await client.query('COMMIT');
      }
      const tickets = (
        await client.query(
          'SELECT t.id::text,s.code AS status,t.assigned_agent_id::text AS agent_id,t.created_at,t.resolved_at,t.closed_at,t.canceled_at FROM tickets t JOIN ticket_statuses s ON s.id=t.status_id ORDER BY t.id',
        )
      ).rows;
      expect(tickets).toHaveLength(7);
      expect((await client.query('SELECT count(*)::int AS n FROM ticket_notes')).rows[0].n).toBe(3);
      const seeded = (
        await client.query('SELECT DISTINCT priority FROM tickets ORDER BY priority')
      ).rows.map((r) => r.priority);
      expect(seeded.sort()).toEqual(['alta', 'baja', 'media', 'urgente']);
      for (const t of tickets) {
        const h = (
          await client.query(
            'SELECT * FROM ticket_events WHERE ticket_id=$1 ORDER BY created_at,id',
            [t.id],
          )
        ).rows;
        expect(h[0].event_type).toBe('created');
        expect(h[0].created_at).toEqual(t.created_at);
        let status = 'creado';
        let agent: string | null = null;
        for (const e of h.slice(1)) {
          if (e.event_type === 'assigned') {
            expect(agent).toBeNull();
            agent = String(e.to_agent_user_id);
          } else if (e.event_type === 'note_added') {
            const note = (await client.query('SELECT * FROM ticket_notes WHERE id=$1', [e.note_id]))
              .rows[0];
            expect(String(note.ticket_id)).toBe(t.id);
            expect(String(note.author_user_id)).toBe(agent);
            expect(note.created_at).toEqual(e.created_at);
          } else {
            expect(e.from_status).toBe(status);
            expect(validTransitions.some(([f, , to]) => f === status && to === e.to_status)).toBe(
              true,
            );
            status = e.to_status;
          }
        }
        expect(status).toBe(t.status);
        expect(agent).toBe(t.agent_id);
        const last = h.filter((e) => e.event_type !== 'note_added').at(-1)!;
        if (status === 'cerrado') expect(last.created_at).toEqual(t.closed_at);
        if (status === 'resuelto') expect(last.created_at).toEqual(t.resolved_at);
        if (status === 'cancelado') expect(last.created_at).toEqual(t.canceled_at);
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  const priority = (id: string, value: string, actor: Account = admin) =>
    request(app)
      .patch(`/api/tickets/${id}/priority`)
      .set('Cookie', actor.cookie)
      .set('Origin', origin)
      .send({ priority: value });
  it.each(['baja', 'alta', 'urgente'])(
    'crear no admite prioridad del cliente: %s',
    async (value) => {
      const r = await create(solicitante, {
        subject: 'Intento',
        description: 'Texto',
        categoryId: category,
        priority: value,
      });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('INVALID_INPUT');
      const t = (await create()).body;
      expect(t.priority).toBe('media');
      expect((await list()).body.data[0].priority).toBe('media');
      expect((await detail(t.id)).body.priority).toBe('media');
    },
  );
  it('prioridad exige sesión, contraseña definitiva y oculta el ticket ajeno', async () => {
    const t = await state();
    expect(
      (
        await request(app)
          .patch(`/api/tickets/${t.id}/priority`)
          .set('Origin', origin)
          .send({ priority: 'alta' })
      ).status,
    ).toBe(401);
    expect((await priority(t.id, 'alta', otro)).status).toBe(404);
    expect((await priority('999999999', 'alta')).status).toBe(404);
    await pool.query('UPDATE users SET must_change_password=true WHERE id=$1', [admin.id]);
    expect((await priority(t.id, 'alta')).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it.each(['agente', 'supervisor', 'administrador'])(
    '%s cambia prioridad con actividad y auditoría sin alterar otros atributos',
    async (role) => {
      const t = await state('resuelto');
      const actor = { agente, supervisor, administrador: admin }[role]!;
      const r = await priority(t.id, 'alta', actor);
      expect(r.status).toBe(200);
      const { priority: newPriority, updatedAt, ...rest } = r.body;
      const { priority: previousPriority, updatedAt: previousUpdated, ...before } = t;
      expect(previousPriority).toBe('media');
      expect(newPriority).toBe('alta');
      expect(rest).toEqual(before);
      expect(new Date(updatedAt).getTime()).toBeGreaterThan(new Date(previousUpdated).getTime());
      const e = (await events(t.id)).body.data[0];
      expect(e).toMatchObject({
        type: 'priority_changed',
        actor: { id: actor.id, role },
        fromPriority: 'media',
        toPriority: 'alta',
        fromStatus: null,
        toStatus: null,
        fromAgent: null,
        toAgent: null,
      });
      expect(Number.isFinite(Date.parse(e.createdAt))).toBe(true);
      const audit = (
        await pool.query(
          "SELECT metadata,actor_user_id::text FROM audit_events WHERE action='ticket.priority_changed'",
        )
      ).rows[0];
      expect(audit).toEqual({
        actor_user_id: actor.id,
        metadata: { fromPriority: 'media', toPriority: 'alta' },
      });
    },
  );
  it('propietario solicitante y agente propietario no asignado carecen del permiso', async () => {
    const t = await state();
    expect((await priority(t.id, 'alta', solicitante)).status).toBe(403);
    expect((await priority(t.id, 'alta', agente2)).status).toBe(403);
    const own = await state('creado', agente.id, agente2);
    expect((await priority(own.id, 'urgente', agente2)).status).toBe(403);
    const ownAssigned = await state('creado', agente2.id, agente2);
    expect((await priority(ownAssigned.id, 'urgente', agente2)).status).toBe(200);
  });
  it.each(['creado', 'en_proceso', 'en_espera', 'resuelto'])(
    'edita prioridad en %s',
    async (status) => {
      const t = await state(status);
      expect((await priority(t.id, 'baja', agente)).status).toBe(200);
    },
  );
  it.each(['cerrado', 'cancelado'])('prioridad histórica queda protegida en %s', async (status) => {
    const t = await state(status);
    await pool.query("UPDATE tickets SET priority='urgente' WHERE id=$1", [t.id]);
    for (const actor of [agente, supervisor, admin]) {
      const r = await priority(t.id, 'baja', actor);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('TICKET_PRIORITY_NOT_EDITABLE');
    }
    expect((await detail(t.id)).body.priority).toBe('urgente');
    expect((await events(t.id)).body.total).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_events WHERE action='ticket.priority_changed'",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it('prioridad repetida no actualiza el ticket, la actividad ni la auditoría', async () => {
    const t = await state();
    const r = await priority(t.id, 'media', agente);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('TICKET_PRIORITY_UNCHANGED');
    expect((await detail(t.id)).body).toEqual(t);
    expect((await events(t.id)).body.total).toBe(1);
    expect((await pool.query('SELECT count(*)::int AS n FROM audit_events')).rows[0].n).toBe(1);
  });
  it.each(['activity', 'audit'])(
    'un fallo de %s revierte prioridad, updated_at y ambos registros',
    async (kind) => {
      const t = await state();
      const table = kind === 'activity' ? 'ticket_events' : 'audit_events';
      const column = kind === 'activity' ? 'event_type' : 'action';
      const value = kind === 'activity' ? 'priority_changed' : 'ticket.priority_changed';
      await pool.query(
        `ALTER TABLE ${table} ADD CONSTRAINT reject_priority CHECK(${column}<>'${value}')`,
      );
      try {
        expect((await priority(t.id, 'alta', agente)).status).toBe(500);
        expect((await detail(t.id)).body).toEqual(t);
        expect((await events(t.id)).body.total).toBe(1);
        expect((await pool.query('SELECT count(*)::int AS n FROM audit_events')).rows[0].n).toBe(1);
      } finally {
        await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT reject_priority`);
      }
    },
  );
  it('dos peticiones concurrentes iguales generan un cambio y un conflicto limpio', async () => {
    const t = await state();
    const r = await Promise.all([
      priority(t.id, 'alta', agente),
      priority(t.id, 'alta', supervisor),
    ]);
    expect(r.map((v) => v.status).sort()).toEqual([200, 409]);
    expect((await events(t.id)).body.data[0]).toMatchObject({
      fromPriority: 'media',
      toPriority: 'alta',
    });
    expect((await events(t.id)).body.total).toBe(2);
  });
  it('dos prioridades concurrentes diferentes conservan una cadena anterior/nueva válida', async () => {
    const t = await state();
    const r = await Promise.all([
      priority(t.id, 'alta', agente),
      priority(t.id, 'urgente', supervisor),
    ]);
    expect(r.map((v) => v.status)).toEqual([200, 200]);
    const history = (await events(t.id)).body.data
      .filter((e: { type: string }) => e.type === 'priority_changed')
      .reverse();
    expect(history[0].fromPriority).toBe('media');
    expect(history[1].fromPriority).toBe(history[0].toPriority);
    expect((await detail(t.id)).body.priority).toBe(history[1].toPriority);
  });
  it('asignación y todas las transiciones conservan prioridad sin automatismos', async () => {
    const t = (await create()).body;
    await priority(t.id, 'urgente');
    expect((await assign(t.id, agente.id)).body.priority).toBe('urgente');
    for (const action of ['start', 'wait', 'resume', 'resolve', 'reopen', 'resolve', 'close'])
      expect((await transition(t.id, action, admin)).body.priority).toBe('urgente');
    const c = (await create()).body;
    await priority(c.id, 'baja');
    expect((await transition(c.id, 'cancel', solicitante)).body.priority).toBe('baja');
  });
  it.each(['baja', 'media', 'alta', 'urgente'])(
    'filtra %s junto con estado, categoría, search y paginación, sin alterar orden',
    async (value) => {
      const ids: string[] = [];
      for (let i = 0; i < 12; i++) {
        const t = (await create()).body;
        ids.push(t.id);
        await pool.query('UPDATE tickets SET priority=$2 WHERE id=$1', [t.id, value]);
      }
      const other = (await create()).body;
      await pool.query(
        "UPDATE tickets SET priority=CASE WHEN $2='media' THEN 'baja' ELSE 'media' END WHERE id=$1",
        [other.id, value],
      );
      await pool.query("UPDATE tickets SET created_at='2026-01-01T00:00:00Z'");
      const query = `priority=${value}&status=creado&categoryId=${category}&search=Impresora&pageSize=10`;
      const first = (await list(solicitante, query)).body;
      const second = (await list(solicitante, query + '&page=2')).body;
      expect(first.total).toBe(12);
      expect(first.data).toHaveLength(10);
      expect(second.data).toHaveLength(2);
      expect(first.data.map((t: { id: string }) => t.id)).toEqual([...ids].reverse().slice(0, 10));
      expect(first.data.every((t: { priority: string }) => t.priority === value)).toBe(true);
      expect((await list(solicitante, 'search=' + value)).body.total).toBe(0);
      expect((await list(otro, 'priority=' + value)).body.total).toBe(0);
    },
  );
  it('valida prioridades, campos extra, CSRF y tipo de cuerpo', async () => {
    const t = await state();
    for (const body of [
      { priority: 'critica' },
      { priority: null },
      { priority: 'ALTA' },
      { priority: 'alta', actor: admin.id },
      { priority: 'alta', role: 'administrador' },
      { priority: 'alta', state: 'creado' },
      { priority: 'alta', fromPriority: 'media' },
      {},
    ])
      expect(
        (
          await request(app)
            .patch(`/api/tickets/${t.id}/priority`)
            .set('Cookie', admin.cookie)
            .set('Origin', origin)
            .send(body)
        ).status,
      ).toBe(400);
    for (const q of [
      'priority=critica',
      'priority=',
      'priority=ALTA',
      'priority=alta&priority=urgente',
    ]) {
      const r = await list(admin, q);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('INVALID_INPUT');
    }
    expect(
      (
        await request(app)
          .patch(`/api/tickets/${t.id}/priority`)
          .set('Cookie', admin.cookie)
          .set('Origin', 'http://otro.invalid')
          .send({ priority: 'alta' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/tickets/${t.id}/priority`)
          .set('Cookie', admin.cookie)
          .set('Origin', origin)
          .type('text')
          .send('alta')
      ).status,
    ).toBe(415);
  });

  const addNote = (
    id: string,
    actor: Account = agente,
    body: object = { body: ' Seguimiento interno\nSegunda línea ' },
  ) =>
    request(app)
      .post(`/api/tickets/${id}/notes`)
      .set('Cookie', actor.cookie)
      .set('Origin', origin)
      .send(body);
  it.each(['agente', 'supervisor', 'administrador'])(
    '%s agrega nota atómica sin cambiar ningún atributo del ticket',
    async (role) => {
      const t = await state('resuelto');
      const actor = { agente, supervisor, administrador: admin }[role]!;
      const r = await addNote(t.id, actor);
      expect(r.status).toBe(201);
      expect(r.body).toEqual({
        id: expect.any(String),
        body: 'Seguimiento interno\nSegunda línea',
        author: { id: actor.id, fullName: 'Empleado' },
        createdAt: expect.any(String),
      });
      expect((await detail(t.id)).body).toEqual(t);
      const persisted = (
        await pool.query('SELECT ticket_id::text,author_user_id::text,body FROM ticket_notes')
      ).rows[0];
      expect(persisted).toEqual({ ticket_id: t.id, author_user_id: actor.id, body: r.body.body });
      const activity = (await events(t.id, actor)).body.data[0];
      expect(activity).toMatchObject({
        type: 'note_added',
        actor: { id: actor.id, role },
        note: { id: r.body.id, body: r.body.body },
      });
      const audit = (
        await pool.query(
          "SELECT actor_user_id::text,metadata FROM audit_events WHERE action='ticket.note_added'",
        )
      ).rows[0];
      expect(audit).toEqual({ actor_user_id: actor.id, metadata: { noteId: r.body.id } });
      expect(JSON.stringify(logs)).not.toContain(r.body.body);
    },
  );
  it('notas requieren sesión definitiva, ticket visible y permisos de soporte, no propiedad', async () => {
    const t = await state('creado', agente.id, agente2);
    expect(
      (
        await request(app)
          .post(`/api/tickets/${t.id}/notes`)
          .set('Origin', origin)
          .send({ body: 'Texto' })
      ).status,
    ).toBe(401);
    expect((await addNote(t.id, otro)).status).toBe(404);
    expect((await addNote('999999999', agente)).status).toBe(404);
    expect((await addNote(t.id, agente2)).body.error.code).toBe('TICKET_NOTE_FORBIDDEN');
    expect((await addNote(t.id, solicitante)).status).toBe(404);
    const owned = await state();
    expect((await addNote(owned.id, solicitante)).status).toBe(403);
    await pool.query('UPDATE users SET must_change_password=true WHERE id=$1', [agente.id]);
    expect((await addNote(t.id)).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it.each([
    {},
    { body: null },
    { body: 32 },
    { body: '' },
    { body: '   \n ' },
    { body: 'x'.repeat(5001) },
    { body: 'Texto', authorId: '1' },
    { body: 'Texto', createdAt: '2026-01-01' },
    { body: 'Texto', visibility: 'public' },
    { body: 'Texto', ticketId: '1' },
    { body: 'Texto', type: 'created' },
  ])('rechaza una nota inválida %#', async (body) => {
    const t = await state();
    const r = await addNote(t.id, agente, body);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INVALID_INPUT');
    expect((await pool.query('SELECT count(*)::int AS n FROM ticket_notes')).rows[0].n).toBe(0);
  });
  it.each(['creado', 'en_proceso', 'en_espera', 'resuelto'])(
    'permite notas en %s y hasta 5000 caracteres tras trim',
    async (status) => {
      const t = await state(status);
      expect((await addNote(t.id, agente, { body: ' ' + 'x'.repeat(5000) + ' ' })).status).toBe(
        201,
      );
    },
  );
  it('filtra notas antes de paginar y contar; propietario agente no recibe ni cuerpo ni indicios', async () => {
    const t = await state('creado', agente.id, agente2);
    for (let i = 0; i < 3; i++)
      expect((await addNote(t.id, agente, { body: `Contenido reservado ${i}` })).status).toBe(201);
    for (const actor of [agente2]) {
      const r = (await events(t.id, actor, '?pageSize=1')).body;
      expect(r).toMatchObject({ total: 1, page: 1, pageSize: 1 });
      expect(r.data.map((e: { type: string }) => e.type)).toEqual(['created']);
      expect(JSON.stringify(r)).not.toMatch(/note|reservado/);
      expect((await events(t.id, actor, '?pageSize=1&page=2')).body.data).toEqual([]);
    }
    for (const actor of [agente, supervisor, admin])
      expect((await events(t.id, actor)).body.total).toBe(4);
    const own = await state();
    await addNote(own.id);
    const publicEvents = (await events(own.id, solicitante)).body;
    expect(publicEvents.total).toBe(1);
    expect(JSON.stringify(publicEvents)).not.toContain('note');
  });
  it('reasignar da al nuevo agente todas las notas históricas y las retira al anterior', async () => {
    const t = await state();
    await addNote(t.id);
    expect((await events(t.id, agente)).body.data[0].note).toBeDefined();
    expect((await assign(t.id, agente2.id, supervisor)).status).toBe(200);
    expect(
      (await events(t.id, agente2)).body.data.some(
        (e: { type: string }) => e.type === 'note_added',
      ),
    ).toBe(true);
    expect(JSON.stringify((await events(t.id, agente)).body)).not.toContain('note');
    expect((await addNote(t.id, agente)).status).toBe(403);
    expect((await addNote(t.id, agente2)).status).toBe(201);
  });
  it.each(['cerrado', 'cancelado'])(
    'en %s mantiene lectura autorizada pero rechaza nuevas notas',
    async (status) => {
      const t = await state();
      await addNote(t.id);
      await pool.query(
        'UPDATE tickets SET status_id=(SELECT id FROM ticket_statuses WHERE code=$2) WHERE id=$1',
        [t.id, status],
      );
      for (const actor of [agente, supervisor, admin]) {
        const r = await addNote(t.id, actor);
        expect(r.status).toBe(409);
        expect(r.body.error.code).toBe('TICKET_NOTES_READ_ONLY');
        expect((await events(t.id, actor)).body.data[0].type).toBe('note_added');
      }
      expect((await events(t.id, solicitante)).body.total).toBe(1);
    },
  );
  it.each(['ticket_events', 'audit_events'])(
    'fallo de %s deshace nota, evento y auditoría',
    async (table) => {
      const t = await state();
      const condition =
        table === 'ticket_events' ? "event_type<>'note_added'" : "action<>'ticket.note_added'";
      await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT reject_note CHECK(${condition})`);
      try {
        expect((await addNote(t.id)).status).toBe(500);
        expect((await pool.query('SELECT count(*)::int AS n FROM ticket_notes')).rows[0].n).toBe(0);
        expect((await events(t.id, agente)).body.total).toBe(1);
        expect((await pool.query('SELECT count(*)::int AS n FROM audit_events')).rows[0].n).toBe(1);
      } finally {
        await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT reject_note`);
      }
    },
  );
  it('PostgreSQL rechaza notas vacías, largas y referencias/eventos incoherentes', async () => {
    const t = await state();
    for (const body of ['', '  ', 'x'.repeat(5001)])
      await expect(
        pool.query('INSERT INTO ticket_notes(ticket_id,author_user_id,body) VALUES($1,$2,$3)', [
          t.id,
          agente.id,
          body,
        ]),
      ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "INSERT INTO ticket_events(ticket_id,event_type,actor_user_id) VALUES($1,'note_added',$2)",
        [t.id, agente.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    const note = await addNote(t.id, agente, { body: '<script>alert(1)</script>\nTexto' });
    expect(note.status).toBe(201);
    expect((await events(t.id, agente)).body.data[0].note.body).toBe(
      '<script>alert(1)</script>\nTexto',
    );
    expect(JSON.stringify(logs)).not.toContain('<script>');
    await expect(
      pool.query('DELETE FROM ticket_notes WHERE id=$1', [note.body.id]),
    ).rejects.toMatchObject({ code: '23503' });
    for (const method of ['put', 'patch', 'delete'] as const)
      expect(
        (
          await request(app)
            [method](`/api/tickets/${t.id}/notes/${note.body.id}`)
            .set('Cookie', admin.cookie)
            .set('Origin', origin)
            .send({ body: 'Cambio' })
        ).status,
      ).toBe(404);
  });

  const contact = (id: string, actor: Account = solicitante) =>
    request(app).get(`/api/tickets/${id}/telegram-contact`).set('Cookie', actor.cookie);
  it('contacto directo usa únicamente @usuario del agente configurado por administrador y no muta el ticket', async () => {
    const t = await state();
    const updated = await request(app)
      .patch(`/api/users/${agente.id}`)
      .set('Origin', origin)
      .set('Cookie', admin.cookie)
      .send({ telegramUsername: ' @Agente_Prueba ' });
    expect(updated.status).toBe(200);
    expect(updated.body.telegramUsername).toBe('agente_prueba');
    const r = await contact(t.id);
    expect(r.status).toBe(200);
    const target = new URL(r.body.url);
    expect(target.origin + target.pathname).toBe('https://t.me/agente_prueba');
    expect(target.searchParams.get('text')).toBe(
      `Hola, te contacto por el ticket ${t.number}: "${t.subject}".`,
    );
    expect(JSON.stringify(r.body)).not.toMatch(/token|chatId|userId/);
    expect((await detail(t.id)).body).toEqual(t);
    expect((await events(t.id, agente)).body.total).toBe(1);
    expect(
      (await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE target_type='ticket'"))
        .rows[0].n,
    ).toBe(1);
    expect(
      (
        await request(app)
          .patch(`/api/users/${agente.id}`)
          .set('Origin', origin)
          .set('Cookie', admin.cookie)
          .send({ telegramUsername: null })
      ).status,
    ).toBe(200);
    expect((await contact(t.id)).body).toEqual({
      available: false,
      message: 'Este agente no tiene Telegram configurado.',
    });
  });
  it('contacto requiere propietario, no rol de soporte; sin agente o Telegram devuelve mensaje no técnico', async () => {
    const free = await state('creado', null);
    expect((await contact(free.id)).body).toEqual({
      available: false,
      message: 'Este ticket todavía no tiene un agente asignado.',
    });
    const t = await state();
    expect((await request(app).get(`/api/tickets/${t.id}/telegram-contact`)).status).toBe(401);
    expect((await contact(t.id, otro)).status).toBe(404);
    for (const actor of [agente, agente2, supervisor, admin])
      expect((await contact(t.id, actor)).status).toBe(403);
    expect((await contact(t.id)).body).toEqual({
      available: false,
      message: 'Este agente no tiene Telegram configurado.',
    });
    const own = await state('creado', agente.id, agente);
    expect((await contact(own.id, agente)).status).toBe(403);
    for (const owner of [agente2, supervisor, admin]) {
      const owned = await state('creado', agente.id, owner);
      expect((await contact(owned.id, owner)).status).toBe(200);
    }
  });
  it.each(['cerrado', 'cancelado'])('contacto no se ofrece en %s', async (status) => {
    const t = await state(status);
    const r = await contact(t.id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('TICKET_CONTACT_UNAVAILABLE');
  });
  it('un agente inactivo o vencido no se publica como destino', async () => {
    const t = await state();
    await pool.query(
      "UPDATE users SET telegram_username='agente_prueba',is_active=false WHERE id=$1",
      [agente.id],
    );
    expect((await contact(t.id)).body.available).toBe(false);
    await pool.query(
      "UPDATE users SET is_active=true,expires_at=now()-interval '1 minute' WHERE id=$1",
      [agente.id],
    );
    expect((await contact(t.id)).body.available).toBe(false);
  });
  it('solo administrador configura un @usuario; rechaza enlaces, IDs numéricos y caracteres arbitrarios', async () => {
    for (const value of [
      'https://t.me/usuario',
      '1234567',
      'abc',
      'otro/usuario',
      'usuario?start=secreto',
    ]) {
      const r = await request(app)
        .patch(`/api/users/${agente.id}`)
        .set('Origin', origin)
        .set('Cookie', admin.cookie)
        .send({ telegramUsername: value });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('INVALID_INPUT');
    }
    expect(
      (
        await request(app)
          .patch(`/api/users/${agente.id}`)
          .set('Origin', origin)
          .set('Cookie', agente.cookie)
          .send({ telegramUsername: 'agente_prueba' })
      ).status,
    ).toBe(403);
    await expect(
      pool.query("UPDATE users SET telegram_username='https://malicioso.invalid' WHERE id=$1", [
        agente.id,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  const fixture = (name: string) =>
    readFile(new URL(`../fixtures/images/${name}`, import.meta.url));
  const multipart = (
    actor: Account = solicitante,
    fields: Record<string, string> = {
      subject: 'Impresora',
      description: 'Descripción segura',
      categoryId: category,
    },
  ) => {
    const r = request(app).post('/api/tickets').set('Origin', origin).set('Cookie', actor.cookie);
    for (const [key, value] of Object.entries(fields)) r.field(key, value);
    return r;
  };
  it('multipart sin imagen conserva creación, metadata null y prioridad Media', async () => {
    const r = await multipart();
    expect(r.status).toBe(201);
    expect(r.body.attachment).toBeNull();
    expect(r.body.priority).toBe('media');
    expect(r.body.number).toMatch(/^TK-\d{6,}$/);
  });
  it.each([
    ['valid.jpg', 'image/jpeg', 'foto.jpg'],
    ['valid.jpg', 'image/jpeg', 'foto.jpeg'],
    ['valid.png', 'image/png', 'foto.png'],
    ['valid.webp', 'image/webp', 'foto.webp'],
  ])('crea con %s, persiste BYTEA y protege bytes/headers', async (file, mime, name) => {
    const data = await fixture(file);
    const r = await multipart().attach('image', data, { filename: name, contentType: mime });
    expect(r.status).toBe(201);
    expect(r.body.attachment).toEqual({
      id: expect.any(String),
      fileName: name,
      mimeType: mime,
      sizeBytes: data.length,
    });
    expect(r.body.priority).toBe('media');
    expect(r.body.number).toMatch(/^TK-\d{6,}$/);
    expect((await detail(r.body.id)).body.attachment).toEqual(r.body.attachment);
    expect((await list()).body.data[0].attachment).toEqual(r.body.attachment);
    const stored = (
      await pool.query(
        'SELECT data,original_filename,mime_type FROM ticket_attachments WHERE ticket_id=$1',
        [r.body.id],
      )
    ).rows[0];
    expect(stored.data).toEqual(data);
    expect(stored.mime_type).toBe(mime);
    for (const actor of [solicitante, agente, supervisor, admin]) {
      const image = await request(app)
        .get(`/api/tickets/${r.body.id}/attachment`)
        .set('Cookie', actor.cookie);
      expect(image.status).toBe(200);
      expect(image.body).toEqual(data);
      expect(image.headers['content-type']).toBe(mime);
      expect(image.headers['content-length']).toBe(String(data.length));
      expect(image.headers['x-content-type-options']).toBe('nosniff');
      expect(image.headers['content-disposition']).toContain(`inline; filename="${name}"`);
      expect(image.headers['cache-control']).toBe('no-store');
    }
    expect(
      (await request(app).get(`/api/tickets/${r.body.id}/attachment`).set('Cookie', otro.cookie))
        .status,
    ).toBe(404);
    expect((await events(r.body.id)).body.total).toBe(1);
    const audit = (await pool.query('SELECT action,metadata FROM audit_events')).rows;
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('ticket.created');
    expect(audit[0].metadata).not.toHaveProperty('data');
    expect(audit[0].metadata).not.toHaveProperty('fileName');
    await expect(
      pool.query(
        'INSERT INTO ticket_attachments(ticket_id,original_filename,mime_type,size_bytes,data) VALUES($1,$2,$3,$4,$5)',
        [r.body.id, name, mime, data.length, data],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
  it('permite exactamente 10 MiB y rechaza el byte siguiente', async () => {
    const small = await fixture('valid.png');
    const max = Buffer.concat([small, Buffer.alloc(10 * 1024 * 1024 - small.length)]);
    const ok = await multipart().attach('image', max, {
      filename: 'limite.png',
      contentType: 'image/png',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.attachment.sizeBytes).toBe(10 * 1024 * 1024);
    const fail = await multipart().attach('image', Buffer.concat([max, Buffer.from([0])]), {
      filename: 'exceso.png',
      contentType: 'image/png',
    });
    expect(fail.status).toBe(413);
    expect(fail.body.error.code).toBe('IMAGE_TOO_LARGE');
    expect((await list()).body.total).toBe(1);
  });
  it.each([
    ['invalid.gif', 'image/gif', 'imagen.gif'],
    ['invalid.pdf', 'application/pdf', 'archivo.pdf'],
    ['invalid.pdf', 'image/jpeg', 'renombrado.jpg'],
    ['valid.png', 'image/jpeg', 'imagen.jpg'],
    ['valid.png', 'image/png', 'imagen.exe'],
    ['valid.jpg', 'image/png', 'imagen.jpg'],
  ])('rechaza contenido/MIME/extensión incoherentes %s/%s/%s', async (file, mime, name) => {
    const r = await multipart().attach('image', await fixture(file), {
      filename: name,
      contentType: mime,
    });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INVALID_IMAGE');
    expect((await list()).body.total).toBe(0);
  });
  it.each([
    Buffer.alloc(0),
    Buffer.from('contenido falso'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
  ])('rechaza archivo vacío/falso/SVG %#', async (data) => {
    const r = await multipart().attach('image', data, {
      filename: 'imagen.png',
      contentType: 'image/png',
    });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INVALID_IMAGE');
  });
  it('rechaza dos archivos, campo de archivo inesperado y campos de autoridad', async () => {
    const data = await fixture('valid.png');
    const twice = await multipart()
      .attach('image', data, { filename: 'uno.png', contentType: 'image/png' })
      .attach('image', data, { filename: 'dos.png', contentType: 'image/png' });
    expect(twice.status).toBe(400);
    expect(
      (await multipart().attach('otro', data, { filename: 'uno.png', contentType: 'image/png' }))
        .status,
    ).toBe(400);
    for (const field of ['requesterId', 'status', 'priority', 'assignedAgentId', 'createdAt'])
      expect(
        (
          await multipart(solicitante, {
            subject: 'Asunto',
            description: 'Texto',
            categoryId: category,
            [field]: '1',
          })
        ).status,
      ).toBe(400);
    for (const fields of [
      { subject: '   ', description: 'Texto', categoryId: category },
      { subject: 'x'.repeat(161), description: 'Texto', categoryId: category },
      { subject: 'Asunto', description: 'x'.repeat(5001), categoryId: category },
    ])
      expect(
        (
          await multipart(solicitante, fields).attach('image', data, {
            filename: 'uno.png',
            contentType: 'image/png',
          })
        ).status,
      ).toBe(400);
    expect((await list()).body.total).toBe(0);
  });
  it('multipart conserva CSRF, autenticación y categoría activa; no se habilita en otras rutas', async () => {
    const data = await fixture('valid.png');
    expect(
      (await request(app).post('/api/tickets').set('Origin', origin).field('subject', 'Sin sesión'))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/tickets')
          .set('Origin', 'https://otro.invalid')
          .set('Cookie', solicitante.cookie)
          .field('subject', 'Origen ajeno')
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', origin)
          .field('email', 'persona@example.invalid')
      ).status,
    ).toBe(415);
    await pool.query('UPDATE categories SET is_active=false WHERE id=$1', [category]);
    const r = await multipart().attach('image', data, {
      filename: 'foto.png',
      contentType: 'image/png',
    });
    expect(r.body.error.code).toBe('CATEGORY_INACTIVE');
    expect((await pool.query('SELECT count(*)::int AS n FROM ticket_attachments')).rows[0].n).toBe(
      0,
    );
  });
  it.each(['ticket_attachments', 'ticket_events', 'audit_events'])(
    'fallo en %s revierte ticket, imagen, actividad y auditoría',
    async (table) => {
      const condition = {
        ticket_attachments: 'size_bytes<0',
        ticket_events: "event_type<>'created'",
        audit_events: "action<>'ticket.created'",
      }[table]!;
      await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT reject_image CHECK(${condition})`);
      try {
        const r = await multipart().attach('image', await fixture('valid.png'), {
          filename: 'foto.png',
          contentType: 'image/png',
        });
        expect(r.status).toBe(500);
        for (const target of ['tickets', 'ticket_attachments', 'ticket_events', 'audit_events'])
          expect((await pool.query(`SELECT count(*)::int AS n FROM ${target}`)).rows[0].n).toBe(0);
      } finally {
        await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT reject_image`);
      }
    },
  );
  it('imagen ausente/inexistente y falta de sesión tienen errores apropiados; no hay modificación posterior', async () => {
    const t = (await create()).body;
    expect(
      (await request(app).get(`/api/tickets/${t.id}/attachment`).set('Cookie', solicitante.cookie))
        .body.error.code,
    ).toBe('TICKET_ATTACHMENT_NOT_FOUND');
    expect(
      (await request(app).get('/api/tickets/999999999/attachment').set('Cookie', agente.cookie))
        .body.error.code,
    ).toBe('TICKET_NOT_FOUND');
    expect((await request(app).get(`/api/tickets/${t.id}/attachment`)).status).toBe(401);
    for (const method of ['post', 'put', 'patch', 'delete'] as const)
      expect(
        (
          await request(app)
            [method](`/api/tickets/${t.id}/attachment`)
            .set('Origin', origin)
            .set('Cookie', admin.cookie)
            .send({})
        ).status,
      ).toBe(404);
  });
  it.each(['Error al imprimir & escanear? #piso "A" conexión Wi-Fi', 'x'.repeat(160)])(
    'deep-link codifica asunto real completo y no incorpora otros datos: %s',
    async (subject) => {
      const t = (
        await create(solicitante, {
          subject,
          description: 'Descripción privada que no debe salir',
          categoryId: category,
        })
      ).body;
      await assign(t.id, agente.id);
      await pool.query("UPDATE users SET telegram_username='agente_prueba' WHERE id=$1", [
        agente.id,
      ]);
      const r = await request(app)
        .get(`/api/tickets/${t.id}/telegram-contact?text=INVENTADO&username=malicioso`)
        .set('Cookie', solicitante.cookie);
      expect(r.status).toBe(200);
      const parsed = new URL(r.body.url);
      expect(parsed.origin).toBe('https://t.me');
      expect(parsed.pathname).toBe('/agente_prueba');
      expect(parsed.hash).toBe('');
      expect([...parsed.searchParams.keys()]).toEqual(['text']);
      expect(parsed.searchParams.get('text')).toBe(
        `Hola, te contacto por el ticket ${t.number}: "${subject}".`,
      );
      expect(r.body.url).not.toContain('INVENTADO');
      expect(r.body.url).not.toContain('privada');
    },
  );
});
