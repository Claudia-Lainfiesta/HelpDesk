import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
const url = process.env.DATABASE_URL?.trim();
if (!url)
  console.info('SKIP: migración de referencia requiere DATABASE_URL; usa un esquema privado.');
describe.skipIf(!url)('referencia pública TK y conservación de tickets', () => {
  let client: pg.Client;
  const schema = `hd_reference_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema},pg_catalog`);
    for (const migration of await loadMigrations())
      if (migration.filename < '0012') await client.query(migration.sql);
  });
  afterAll(async () => {
    await client?.query(`DROP SCHEMA ${schema} CASCADE`);
    await client?.end();
  });
  it('recalcula existentes y nuevos, conserva datos, índice, secuencia y auditoría histórica', async () => {
    const user = (
      await client.query<{ id: string }>(
        `INSERT INTO users(full_name,email,role_id,password_hash,must_change_password)
       VALUES('Empleado de prueba','reference@example.invalid',(SELECT id FROM roles WHERE code='administrador'),$1,false) RETURNING id::text`,
        [await hashPassword(randomBytes(24).toString('base64url'))],
      )
    ).rows[0]!.id;
    const category = (
      await client.query("INSERT INTO categories(name) VALUES('Referencia') RETURNING id")
    ).rows[0].id;
    await client.query(
      "INSERT INTO tickets(subject,description,category_id,requester_id) VALUES('Primero','Conservar',$1,$2)",
      [category, user],
    );
    await client.query(
      `INSERT INTO tickets(id,subject,description,category_id,requester_id)
      OVERRIDING SYSTEM VALUE VALUES (42,'Segundo','Conservar',$1,$2),(1000001,'Completo','Conservar',$1,$2)`,
      [category, user],
    );
    const before = (await client.query('SELECT * FROM tickets ORDER BY id')).rows;
    const sequence = (await client.query('SELECT last_value,is_called FROM tickets_id_seq')).rows;
    const index = (
      await client.query(
        "SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='tickets_reference_uidx'",
        [schema],
      )
    ).rows;
    await client.query(
      "INSERT INTO audit_events(actor_user_id,action,target_type,target_id,metadata) VALUES($1,'ticket.created','ticket',1,$2)",
      [user, { ticketNumber: before[0].reference, categoryId: String(category) }],
    );
    const audit = (await client.query('SELECT * FROM audit_events')).rows;
    const migration = (await loadMigrations()).find(
      (m) => m.filename === '0012_ticket_reference_tk.sql',
    )!;
    await client.query('BEGIN');
    await client.query(migration.sql);
    await client.query('COMMIT');
    const after = (await client.query('SELECT * FROM tickets ORDER BY id')).rows;
    expect(after.map((r) => r.reference)).toEqual(['TK-000001', 'TK-000042', 'TK-1000001']);
    expect(after.map(({ reference: _reference, ...rest }) => rest)).toEqual(
      before.map(({ reference: _reference, ...rest }) => rest),
    );
    expect((await client.query('SELECT last_value,is_called FROM tickets_id_seq')).rows).toEqual(
      sequence,
    );
    expect(
      (
        await client.query(
          "SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='tickets_reference_uidx'",
          [schema],
        )
      ).rows,
    ).toEqual(index);
    expect((await client.query('SELECT * FROM audit_events')).rows).toEqual(audit);
    const created = await client.query(
      "INSERT INTO tickets(subject,description,category_id,requester_id) VALUES('Nuevo','Texto',$1,$2) RETURNING reference",
      [category, user],
    );
    expect(created.rows[0].reference).toBe('TK-000002');
  });
});
