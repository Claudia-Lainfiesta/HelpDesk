import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { loadMigrations } from '../../src/db/migrations.js';
import { hashPassword } from '../../src/auth/password.js';
const url = process.env.DATABASE_URL?.trim();
if (!url) console.info('SKIP: migración de cuentas requiere DATABASE_URL; usa esquemas privados.');
describe.skipIf(!url)('migración a cuentas con contraseña obligatoria', () => {
  let client: pg.Client, schema: string;
  let sql: string, previousColumn: string, retiredValue: string, hash: string;
  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    hash = await hashPassword(randomBytes(24).toString('hex'));
    const migrations = await loadMigrations();
    sql = migrations.find((m) => m.filename === '0010_local_accounts_only.sql')!.sql;
    // Lee el contrato retirado desde su migración inmutable, sin duplicarlo en el código activo.
    const old = migrations.find((m) => m.filename === '0008_user_management.sql')!.sql;
    previousColumn = old.match(/ADD COLUMN (\w+)/)![1]!;
    retiredValue = old.match(/CHECK \(\w+ IN \('\w+', '(\w+)'\)\)/)![1]!;
  });
  beforeEach(async () => {
    schema = `hd_migration_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema},pg_catalog`);
    for (const m of await loadMigrations()) if (m.filename < '0010') await client.query(m.sql);
  });
  afterEach(async () => {
    await client.query(`DROP SCHEMA ${schema} CASCADE`);
  });
  afterAll(async () => {
    await client?.end();
  });
  async function user(retired = false, admin = false) {
    return (
      await client.query<{ id: string }>(
        `INSERT INTO users(full_name,email,role_id,password_hash,${previousColumn}) VALUES('Prueba',$1,(SELECT id FROM roles WHERE code=$2),$3,$4) RETURNING id::text`,
        [
          `${randomUUID()}@example.invalid`,
          admin ? 'administrador' : 'agente',
          retired ? null : hash,
          retired ? retiredValue : 'local',
        ],
      )
    ).rows[0]!.id;
  }
  it('retira cuentas y sesiones conservando eventos, autor original y cuentas restantes', async () => {
    const admin = await user(false, true);
    const removed = await user(true);
    const kept = await user();
    await client.query('UPDATE users SET created_by=$1 WHERE id=$2', [removed, kept]);
    await client.query(
      "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,'hash-test',now()+interval '1 hour')",
      [removed],
    );
    await client.query(
      "INSERT INTO audit_events(actor_user_id,action,target_type,target_id) VALUES($1,'users.created','user',$2)",
      [removed, kept],
    );
    await client.query(sql);
    expect(
      (await client.query('SELECT id::text FROM users ORDER BY id')).rows.map((r) => r.id),
    ).toEqual([admin, kept]);
    expect((await client.query('SELECT count(*)::int AS n FROM sessions')).rows[0].n).toBe(0);
    const event = (await client.query('SELECT actor_user_id,metadata FROM audit_events')).rows[0];
    expect(event).toEqual({ actor_user_id: null, metadata: { removedActorUserId: removed } });
    expect(
      (await client.query('SELECT created_by FROM users WHERE id=$1', [kept])).rows[0].created_by,
    ).toBeNull();
    expect(
      (
        await client.query(
          'SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND column_name=$2',
          [schema, previousColumn],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      client.query('UPDATE users SET password_hash=NULL WHERE id=$1', [kept]),
    ).rejects.toMatchObject({ code: '23502' });
  });
  it('aborta si solo existe un administrador retirado y no deja cambios parciales', async () => {
    const retired = await user(true, true);
    await client.query('BEGIN');
    await expect(client.query(sql)).rejects.toThrow('Debe existir un administrador');
    await client.query('ROLLBACK');
    expect((await client.query('SELECT id::text FROM users')).rows[0].id).toBe(retired);
  });
  it('aborta antes de modificar cuentas con hash pendiente', async () => {
    await user(false, true);
    const id = await user();
    await client.query('UPDATE users SET password_hash=NULL WHERE id=$1', [id]);
    await client.query('BEGIN');
    await expect(client.query(sql)).rejects.toThrow('restablecer su contraseña');
    await client.query('ROLLBACK');
  });
  it('no borra tickets cuyo solicitante sería eliminado', async () => {
    await user(false, true);
    const id = await user(true);
    const category = (
      await client.query("INSERT INTO categories(name) VALUES('Histórica') RETURNING id")
    ).rows[0].id;
    await client.query(
      "INSERT INTO tickets(subject,description,category_id,requester_id) VALUES('Conservar','Texto',$1,$2)",
      [category, id],
    );
    await client.query('BEGIN');
    await expect(client.query(sql)).rejects.toThrow('Hay tickets');
    await client.query('ROLLBACK');
    expect((await client.query('SELECT count(*)::int AS n FROM tickets')).rows[0].n).toBe(1);
  });
  it('permite instalaciones vacías para crear después el primer administrador', async () => {
    await client.query(sql);
    expect(
      (
        await client.query(
          "SELECT is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='users' AND column_name='password_hash'",
          [schema],
        )
      ).rows[0].is_nullable,
    ).toBe('NO');
  });
});
