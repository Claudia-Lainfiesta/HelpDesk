import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
const url = process.env.DATABASE_URL?.trim();
if (!url)
  console.info('SKIP: migración de prioridad requiere DATABASE_URL; utiliza un esquema privado.');
describe.skipIf(!url)('migración de prioridad sin inferencia histórica', () => {
  let client: pg.Client;
  const schema = `hd_priority_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema},pg_catalog`);
    for (const m of await loadMigrations()) if (m.filename < '0014') await client.query(m.sql);
  });
  afterAll(async () => {
    await client?.query(`DROP SCHEMA ${schema} CASCADE`);
    await client?.end();
  });
  it('normaliza existentes a media, conserva sus datos/eventos e impone default, nulabilidad y formas', async () => {
    const user = (
      await client.query(
        "INSERT INTO users(full_name,email,role_id,password_hash,must_change_password) VALUES('Prueba','migration@example.invalid',(SELECT id FROM roles WHERE code='agente'),$1,false) RETURNING id::text",
        [await hashPassword(randomBytes(24).toString('hex'))],
      )
    ).rows[0].id;
    const category = (
      await client.query(
        "INSERT INTO categories(name) VALUES('Prueba de prioridad') RETURNING id::text",
      )
    ).rows[0].id;
    await client.query(
      `INSERT INTO tickets(subject,description,category_id,requester_id,status_id) SELECT 'Anterior','Conservar',$1,$2,id FROM ticket_statuses`,
      [category, user],
    );
    await client.query(
      "INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,created_at) SELECT id,'created',requester_id,created_at FROM tickets",
    );
    const before = (await client.query('SELECT * FROM tickets ORDER BY id')).rows;
    const history = (await client.query('SELECT * FROM ticket_events ORDER BY id')).rows;
    const migration = (await loadMigrations()).find(
      (m) => m.filename === '0014_ticket_priority.sql',
    )!;
    await client.query('BEGIN');
    await client.query(migration.sql);
    await client.query('COMMIT');
    const after = (await client.query('SELECT * FROM tickets ORDER BY id')).rows;
    expect(after.every((t) => t.priority === 'media')).toBe(true);
    expect(after.map(({ priority: _priority, ...rest }) => rest)).toEqual(before);
    expect((await client.query('SELECT * FROM ticket_events ORDER BY id')).rows).toEqual(
      history.map((e) => ({ ...e, from_priority: null, to_priority: null })),
    );
    const t = (
      await client.query(
        "INSERT INTO tickets(subject,description,category_id,requester_id) VALUES('Nuevo','Texto',$1,$2) RETURNING id::text,priority",
        [category, user],
      )
    ).rows[0];
    expect(t.priority).toBe('media');
    for (const value of ['critica', 'MEDIA', '', null])
      await expect(
        client.query('UPDATE tickets SET priority=$2 WHERE id=$1', [t.id, value]),
      ).rejects.toMatchObject({ code: value === null ? '23502' : '23514' });
    for (const value of ['baja', 'media', 'alta', 'urgente'])
      await client.query('UPDATE tickets SET priority=$2 WHERE id=$1', [t.id, value]);
    const insert = (from: string | null, to: string | null, type = 'priority_changed') =>
      client.query(
        'INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,from_priority,to_priority) VALUES($1,$2,$3,$4,$5)',
        [t.id, type, user, from, to],
      );
    for (const [from, to, type] of [
      ['media', 'alta', 'created'],
      ['media', 'media', 'priority_changed'],
      [null, 'alta', 'priority_changed'],
      ['media', null, 'priority_changed'],
      ['critica', 'alta', 'priority_changed'],
      ['media', 'critica', 'priority_changed'],
    ] as const)
      await expect(insert(from, to, type)).rejects.toMatchObject({ code: '23514' });
    await insert('media', 'alta');
    expect(
      (
        await client.query(
          "SELECT count(*)::int AS n FROM ticket_events WHERE event_type='priority_changed'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
});
