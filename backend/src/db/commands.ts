import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { env } from '../config/env.js';
import { seedDevelopmentPasswords } from '../auth/seed.js';
import {
  ensureMigrationTable,
  inTransaction,
  loadMigrations,
  migrate,
  seedFile,
  verifyMigrations,
} from './migrations.js';

// El mismo lock de sesión cubre migrate, status, reset y seed, incluso entre transacciones.
export const advisoryLockKeys = [20261029, 4] as const;

export function assertLocalDevelopment(nodeEnv: string, databaseUrl: string): void {
  const url = new URL(databaseUrl);
  if (
    nodeEnv !== 'development' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    ['host', 'hostaddr', 'service'].some((key) => url.searchParams.has(key))
  ) {
    throw new Error(
      'Operación rechazada: reset y seed solo se permiten con NODE_ENV=development y DATABASE_URL en localhost o 127.0.0.1, sin redirecciones de host.',
    );
  }
}

export async function withDatabaseLock(
  action: (client: pg.Client) => Promise<void>,
): Promise<void> {
  const client = new pg.Client({
    connectionString: env.databaseUrl,
    connectionTimeoutMillis: 5000,
    application_name: 'helpdesk-db-cli',
  });
  await client.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', [...advisoryLockKeys]);
    locked = true;
    await client.query("SET TIME ZONE 'UTC'");
    await client.query('SET search_path TO public');
    await action(client);
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock($1, $2)', [...advisoryLockKeys]);
    } finally {
      await client.end();
    }
  }
}

export async function runDatabaseCommand(command: string): Promise<void> {
  if (!['migrate', 'status', 'reset', 'seed'].includes(command)) {
    throw new Error('Comando inválido. Usa db:migrate, db:status, db:new, db:reset o db:seed:dev.');
  }
  if (command === 'reset' || command === 'seed') {
    assertLocalDevelopment(env.nodeEnv, env.databaseUrl);
  }
  const migrations = await loadMigrations();
  await withDatabaseLock(async (client) => {
    if (command === 'reset') {
      await inTransaction(client, async () => {
        await client.query('DROP SCHEMA public CASCADE');
        await client.query('CREATE SCHEMA public');
      });
      console.log('Esquema public recreado.');
    }
    if (command === 'migrate' || command === 'reset') {
      await migrate(client, migrations);
      return;
    }

    await ensureMigrationTable(client);
    const applied = await verifyMigrations(client, migrations);
    const byFilename = new Map(applied.map((row) => [row.filename, row]));
    if (command === 'status') {
      for (const migration of migrations) {
        const row = byFilename.get(migration.filename);
        console.log(
          `${row ? 'APLICADA ' : 'PENDIENTE'}  ${migration.filename}${row ? `  ${row.applied_at.toISOString()}` : ''}`,
        );
      }
      console.log(
        `${applied.length} aplicada(s), ${migrations.length - applied.length} pendiente(s).`,
      );
      return;
    }
    if (migrations.some((migration) => !byFilename.has(migration.filename))) {
      throw new Error('Hay migraciones pendientes. Ejecuta npm run db:migrate antes del seed.');
    }
    const sql = await readFile(seedFile, 'utf8');
    await inTransaction(client, async () => {
      await client.query(sql);
      await seedDevelopmentPasswords(client);
    });
    console.log('Datos de desarrollo cargados (seed idempotente).');
  });
}
