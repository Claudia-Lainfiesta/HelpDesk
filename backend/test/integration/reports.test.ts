import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { hashPassword } from '../../src/auth/password.js';
import { loadMigrations } from '../../src/db/migrations.js';
const url = process.env.DATABASE_URL?.trim();
if (!url)
  console.info(
    'SKIP: reportes requiere DATABASE_URL exportada; usa un esquema privado de pruebas.',
  );
describe.skipIf(!url)('reportes con PostgreSQL real', () => {
  const schema = `hd_reports_${randomUUID().replaceAll('-', '')}`;
  let setup: pg.Client, pool: pg.Pool, app: Express;
  const users: Record<string, { id: string; cookie: string }> = {};
  let category: string, inactive: string, agentB: string, emptyAgent: string;
  const range = {
    from: '2026-01-01T06:00:00.000Z',
    to: '2026-01-31T05:59:59.999Z',
    timeZone: 'America/Guatemala',
  };
  const paths = [
    'summary',
    'by-status',
    'by-priority',
    'by-category',
    'trend',
    'by-agent',
    'options',
    'export.csv',
  ];
  const get = (path: string, query: object = range, role = 'supervisor') =>
    request(app).get(`/api/reports/${path}`).query(query).set('Cookie', users[role]!.cookie);
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
    const { createApp } = await import('../../src/app.js');
    app = createApp({ ...env, nodeEnv: 'test' });
    const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
    for (const role of ['solicitante', 'agente', 'supervisor', 'administrador']) {
      const id = (
        await pool.query<{ id: string }>(
          `INSERT INTO users(full_name,email,role_id,must_change_password,password_hash) VALUES($1,$2,(SELECT id FROM roles WHERE code=$3),false,$4) RETURNING id::text`,
          [role, `${randomUUID()}@example.invalid`, role, passwordHash],
        )
      ).rows[0]!.id;
      const token = randomBytes(32).toString('base64url');
      await pool.query(
        "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",
        [id, createHash('sha256').update(token).digest('hex')],
      );
      users[role] = { id, cookie: `hd_session=${token}` };
    }
    agentB = (
      await pool.query<{ id: string }>(
        `INSERT INTO users(full_name,email,role_id,is_active,password_hash) VALUES('Agente histórico',$1,(SELECT id FROM roles WHERE code='agente'),false,$2) RETURNING id::text`,
        [`${randomUUID()}@example.invalid`, passwordHash],
      )
    ).rows[0]!.id;
    emptyAgent = (
      await pool.query<{ id: string }>(
        `INSERT INTO users(full_name,email,role_id,password_hash) VALUES('Sin datos',$1,(SELECT id FROM roles WHERE code='agente'),$2) RETURNING id::text`,
        [`${randomUUID()}@example.invalid`, passwordHash],
      )
    ).rows[0]!.id;
    category = (
      await pool.query<{ id: string }>(
        "INSERT INTO categories(name) VALUES('Activa') RETURNING id::text",
      )
    ).rows[0]!.id;
    inactive = (
      await pool.query<{ id: string }>(
        "INSERT INTO categories(name,is_active) VALUES('Histórica',false) RETURNING id::text",
      )
    ).rows[0]!.id;
    async function ticket(
      created: string,
      status: string,
      priority: string,
      cat: string,
      agent: string | null,
      resolved: string | null = null,
      closed: string | null = null,
      canceled: string | null = null,
    ) {
      await pool.query(
        `INSERT INTO tickets(subject,description,category_id,requester_id,assigned_agent_id,status_id,priority,created_at,resolved_at,closed_at,canceled_at)
        VALUES('Asunto reservado','Descripción privada',$1,$2,$3,(SELECT id FROM ticket_statuses WHERE code=$4),$5,$6,$7,$8,$9)`,
        [cat, users.solicitante!.id, agent, status, priority, created, resolved, closed, canceled],
      );
    }
    await ticket(
      '2025-12-31T08:00:00Z',
      'resuelto',
      'alta',
      category,
      users.agente!.id,
      '2026-01-02T08:00:00Z',
    );
    await ticket(range.from, 'creado', 'media', category, null);
    await ticket(
      '2026-01-03T06:00:00Z',
      'cerrado',
      'urgente',
      inactive,
      users.agente!.id,
      '2026-01-04T06:00:00Z',
      '2026-01-05T06:00:00Z',
    );
    await ticket(
      '2026-01-03T06:00:00Z',
      'cancelado',
      'baja',
      category,
      agentB,
      null,
      null,
      '2026-01-06T06:00:00Z',
    );
    await ticket('2026-01-31T05:59:59.999500Z', 'en_espera', 'media', category, agentB);
    await ticket('2026-01-31T06:00:00Z', 'en_proceso', 'alta', category, users.agente!.id);
    await ticket(
      '2026-01-01T05:59:59.999Z',
      'cerrado',
      'alta',
      category,
      users.agente!.id,
      '2026-01-31T06:00:00Z',
      '2026-02-01T06:00:00Z',
    );
  });
  afterAll(async () => {
    await pool?.end();
    await setup?.query(`DROP SCHEMA ${schema} CASCADE`);
    await setup?.end();
  });
  it.each(paths)('protege todos los roles y sesiones: %s', async (path) => {
    expect((await request(app).get(`/api/reports/${path}`)).status).toBe(401);
    for (const role of ['solicitante', 'agente'])
      expect((await get(path, range, role)).status).toBe(403);
    for (const role of ['supervisor', 'administrador'])
      expect((await get(path, range, role)).status).toBe(200);
  });
  it('mide cada evento por su fecha y el snapshot sin restringir creación; respeta microsegundos límite', async () => {
    const response = await get('summary');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      range,
      filters: { categoryId: null, agentId: null },
      kpis: {
        created: 4,
        resolved: 2,
        closed: 1,
        canceled: 1,
        pendingNow: 4,
        averageResolutionMinutes: 2160,
        averageCloseMinutes: 2880,
      },
    });
  });
  it('filtra categoría, agente y combinación, incluyendo inactivos', async () => {
    expect((await get('summary', { ...range, categoryId: inactive })).body.kpis).toMatchObject({
      created: 1,
      resolved: 1,
      closed: 1,
      pendingNow: 0,
      averageResolutionMinutes: 1440,
    });
    expect((await get('summary', { ...range, agentId: agentB })).body.kpis).toMatchObject({
      created: 2,
      resolved: 0,
      canceled: 1,
      pendingNow: 1,
      averageResolutionMinutes: null,
    });
    expect(
      (await get('summary', { ...range, categoryId: inactive, agentId: agentB })).body.kpis,
    ).toMatchObject({
      created: 0,
      resolved: 0,
      closed: 0,
      canceled: 0,
      pendingNow: 0,
      averageResolutionMinutes: null,
      averageCloseMinutes: null,
    });
  });
  it.each([
    'summary',
    'by-status',
    'by-priority',
    'by-category',
    'trend',
    'by-agent',
    'export.csv',
  ])('valida filtros y fechas: %s', async (path) => {
    for (const query of [
      { ...range, agentId: '0' },
      { ...range, categoryId: '999999999' },
      { ...range, agentId: users.solicitante!.id },
      { ...range, from: 'invalido' },
      { ...range, to: '2025-01-01' },
      { ...range, to: '2027-01-02' },
    ]) {
      const r = await get(path, query);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('INVALID_INPUT');
    }
  });
  it('incluye estados/prioridades con cero y agrupa la cohorte creada por atributos actuales', async () => {
    expect((await get('by-status')).body.items).toEqual([
      { status: 'creado', count: 1 },
      { status: 'en_proceso', count: 0 },
      { status: 'en_espera', count: 1 },
      { status: 'resuelto', count: 0 },
      { status: 'cerrado', count: 1 },
      { status: 'cancelado', count: 1 },
    ]);
    expect((await get('by-priority')).body.items).toEqual([
      { priority: 'baja', count: 1 },
      { priority: 'media', count: 2 },
      { priority: 'alta', count: 0 },
      { priority: 'urgente', count: 1 },
    ]);
    expect((await get('by-category')).body.items).toEqual([
      { category: { id: category, name: 'Activa', isActive: true }, count: 3 },
      { category: { id: inactive, name: 'Histórica', isActive: false }, count: 1 },
    ]);
  });
  it('rellena días sin eventos y agrupa según zona local y fecha de cada evento', async () => {
    const r = await get('trend');
    expect(r.status).toBe(200);
    expect(r.body.granularity).toBe('day');
    expect(r.body.items).toHaveLength(30);
    expect(r.body.items[0]).toEqual({
      bucket: '2026-01-01',
      created: 1,
      resolved: 0,
      closed: 0,
      canceled: 0,
    });
    expect(r.body.items[1]).toEqual({
      bucket: '2026-01-02',
      created: 0,
      resolved: 1,
      closed: 0,
      canceled: 0,
    });
    expect(r.body.items[3].resolved).toBe(1);
    expect(r.body.items[4].closed).toBe(1);
    expect(r.body.items[5].canceled).toBe(1);
    expect(r.body.items[6]).toMatchObject({ created: 0, resolved: 0, closed: 0, canceled: 0 });
    expect(r.body.items[29]).toMatchObject({ bucket: '2026-01-30', created: 1 });
  });
  it('agrupa por semana y mes sin perder eventos y mantiene límites parciales', async () => {
    const week = (await get('trend', { from: '2026-01-01', to: '2026-03-31' })).body;
    expect(week.granularity).toBe('week');
    expect(week.items[0].bucket).toBe('2025-12-29');
    expect(week.items.reduce((n: number, i: { created: number }) => n + i.created, 0)).toBe(6);
    const month = (await get('trend', { from: '2026-01-01', to: '2026-12-31' })).body;
    expect(month.granularity).toBe('month');
    expect(month.items).toHaveLength(12);
    expect(month.items[0]).toMatchObject({
      bucket: '2026-01-01',
      created: 6,
      resolved: 3,
      closed: 1,
      canceled: 1,
    });
    expect(month.items[1].closed).toBe(1);
    expect(month.items[11].created).toBe(0);
  });
  it('una jornada DST sigue siendo un único bucket local', async () => {
    for (const [from, to] of [
      ['2026-03-08T05:00:00.000Z', '2026-03-09T03:59:59.999Z'],
      ['2026-11-01T04:00:00.000Z', '2026-11-02T04:59:59.999Z'],
    ]) {
      const r = await get('trend', { from, to, timeZone: 'America/New_York' });
      expect(r.status).toBe(200);
      expect(r.body.items).toHaveLength(1);
    }
  });
  it('agentes usa asignación actual, incluye inactivos y excluye sin datos', async () => {
    expect((await get('by-agent')).body.items).toEqual([
      {
        agent: { id: users.agente!.id, fullName: 'agente', isActive: true },
        assignedNow: 2,
        resolvedInRange: 2,
        closedInRange: 1,
        averageResolutionMinutes: 2160,
      },
      {
        agent: { id: agentB, fullName: 'Agente histórico', isActive: false },
        assignedNow: 1,
        resolvedInRange: 0,
        closedInRange: 0,
        averageResolutionMinutes: null,
      },
    ]);
    expect((await get('by-agent', { ...range, agentId: agentB })).body.items).toHaveLength(1);
    expect((await get('by-agent', { ...range, agentId: emptyAgent })).body.items).toEqual([]);
  });
  it('sin eventos conserva snapshot y promedios nulos', async () => {
    const empty = { from: '2020-01-01', to: '2020-01-07' };
    expect((await get('summary', empty)).body.kpis).toEqual({
      created: 0,
      resolved: 0,
      closed: 0,
      canceled: 0,
      pendingNow: 4,
      averageResolutionMinutes: null,
      averageCloseMinutes: null,
    });
    expect((await get('by-category', empty)).body.items).toEqual([]);
  });
  it('las opciones mínimas no exponen datos privados y conservan históricos', async () => {
    const r = await get('options', {});
    expect(r.body.categories).toHaveLength(2);
    expect(r.body.agents).toHaveLength(3);
    expect(r.body.agents).toContainEqual({
      id: agentB,
      fullName: 'Agente histórico',
      isActive: false,
    });
    for (const item of r.body.agents)
      expect(Object.keys(item).sort()).toEqual(['fullName', 'id', 'isActive']);
  });
  it('CSV usa la cohorte creada, filtros combinados, históricos y límites inclusivos; no datos sensibles', async () => {
    const response = await get('export.csv');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="helpdesk-reporte-2026-01-01-a-2026-01-30.csv"',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.text.startsWith('\uFEFF')).toBe(true);
    expect(response.text.trim().split('\r\n')).toHaveLength(5);
    expect(response.text).toContain('"Histórica"');
    expect(response.text).toContain('"1 d"');
    for (const secret of [
      'Descripción privada',
      'example.invalid',
      'telegram',
      'password',
      'attachment',
      'note',
    ])
      expect(response.text).not.toContain(secret);
    for (const [filters, count] of [
      [{ categoryId: category }, 3],
      [{ agentId: agentB }, 2],
      [{ categoryId: category, agentId: agentB }, 2],
      [{ categoryId: inactive, agentId: agentB }, 0],
      [{ from: '2020-01-01', to: '2020-01-07' }, 0],
    ] as const) {
      const csv = await get('export.csv', { ...range, ...filters });
      expect(csv.status).toBe(200);
      expect(csv.text.trim().split('\r\n')).toHaveLength(count + 1);
      const summary = await get('summary', { ...range, ...filters });
      expect(summary.body.kpis.created).toBe(count);
    }
  });
  it('CSV protege datos controlados por usuarios y conserva acentos, comas, comillas y saltos', async () => {
    const subject = '=SUM(1,2) "José"\nOtra línea';
    const {
      rows: [row],
    } = await pool.query<{ id: string }>(
      `INSERT INTO tickets(subject,description,category_id,requester_id,status_id,created_at)
      VALUES($1,'CUERPO_PRIVADO_CSV',$2,$3,(SELECT id FROM ticket_statuses WHERE code='creado'),'2020-02-01T12:00:00Z') RETURNING id::text`,
      [subject, category, users.solicitante!.id],
    );
    try {
      const csv = await get('export.csv', { from: '2020-02-01', to: '2020-02-01' });
      expect(csv.status).toBe(200);
      expect(csv.text).toContain('"\'=SUM(1,2) ""José""\nOtra línea"');
      expect(csv.text).not.toContain('CUERPO_PRIVADO_CSV');
      expect(csv.text).toContain('"2020-02-01 12:00:00 UTC"');
    } finally {
      await pool.query('DELETE FROM tickets WHERE id=$1', [row!.id]);
    }
  });
  it('consultar no altera tickets, eventos, notas ni auditoría; no devuelve contenido privado', async () => {
    const snapshot = async () =>
      (
        await pool.query(`SELECT (SELECT json_agg(t ORDER BY id) FROM tickets t) AS tickets,
      (SELECT count(*)::int FROM audit_events) AS audit, (SELECT count(*)::int FROM ticket_events) AS events`)
      ).rows[0];
    const before = await snapshot();
    for (const path of paths) {
      const r = await get(path);
      for (const secret of [
        'Descripción privada',
        'Asunto reservado',
        'example.invalid',
        'telegram',
        'token',
        'password',
        'attachment',
        'note',
      ])
        expect(JSON.stringify(r.body)).not.toContain(secret);
    }
    expect(await snapshot()).toEqual(before);
  });
});
