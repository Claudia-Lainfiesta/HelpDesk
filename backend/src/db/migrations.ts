import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { Client } from 'pg';

export const migrationsDirectory = new URL('../../db/migrations/', import.meta.url);
export const seedFile = new URL('../../db/seeds/dev.sql', import.meta.url);
const filenamePattern = /^\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

export interface Migration {
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  filename: string;
  checksum: string;
  applied_at: Date;
}

export async function loadMigrations(directory = migrationsDirectory): Promise<Migration[]> {
  const filenames = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  const prefixes = new Set<string>();
  const migrations: Migration[] = [];
  for (const filename of filenames) {
    if (!filenamePattern.test(filename)) {
      throw new Error(`Nombre de migración inválido: ${filename}. Usa 0001_descripcion.sql.`);
    }
    const prefix = filename.slice(0, 4);
    if (prefix === '0000' || prefixes.has(prefix)) {
      throw new Error(`Número de migración inválido o repetido: ${prefix}.`);
    }
    prefixes.add(prefix);
    const bytes = await readFile(new URL(filename, directory));
    migrations.push({ filename, sql: bytes.toString('utf8'), checksum: createHash('sha256').update(bytes).digest('hex') });
  }
  return migrations;
}

export async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
    COMMENT ON TABLE public.schema_migrations IS 'Historial de migraciones SQL aplicadas por la herramienta de HelpDesk.';
    COMMENT ON COLUMN public.schema_migrations.checksum IS 'SHA-256 de los bytes originales del archivo aplicado.'
  `);
}

export async function verifyMigrations(client: Client, migrations: Migration[]): Promise<AppliedMigration[]> {
  const { rows } = await client.query<AppliedMigration>(
    'SELECT filename, checksum, applied_at FROM public.schema_migrations ORDER BY filename',
  );
  const files = new Map(migrations.map((migration) => [migration.filename, migration]));
  for (const applied of rows) {
    const file = files.get(applied.filename);
    if (!file) {
      throw new Error(`Falta el archivo de una migración aplicada: ${applied.filename}. Restaura el archivo original.`);
    }
    if (file.checksum !== applied.checksum) {
      throw new Error(`Checksum distinto en ${applied.filename}: las migraciones aplicadas son inmutables. Restaura el original y crea una migración nueva.`);
    }
  }
  return rows;
}

export async function inTransaction(client: Client, action: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await action();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function migrate(client: Client, migrations: Migration[]): Promise<void> {
  await ensureMigrationTable(client);
  const applied = new Set((await verifyMigrations(client, migrations)).map((row) => row.filename));
  let count = 0;
  for (const migration of migrations) {
    if (applied.has(migration.filename)) continue;
    try {
      await inTransaction(client, async () => {
        await client.query(migration.sql);
        await client.query('INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)', [
          migration.filename, migration.checksum,
        ]);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error SQL';
      throw new Error(`Falló ${migration.filename}; se revirtió su transacción: ${message}`, { cause: error });
    }
    console.log(`Aplicada: ${migration.filename}`);
    count++;
  }
  console.log(count ? `${count} migración(es) aplicada(s).` : 'Sin migraciones pendientes.');
}

export async function createMigration(name: string, directory = migrationsDirectory): Promise<string> {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!slug) throw new Error('Indica un nombre: npm run db:new -- agregar_campo.');
  await mkdir(directory, { recursive: true });
  const migrations = await loadMigrations(directory);
  const next = Math.max(0, ...migrations.map((file) => Number(file.filename.slice(0, 4)))) + 1;
  if (next > 9999) throw new Error('Se agotó la numeración de cuatro dígitos.');
  const filename = `${String(next).padStart(4, '0')}_${slug}.sql`;
  await writeFile(new URL(filename, directory), `-- ${slug}\n-- El ejecutor administra la transacción; no incluyas BEGIN ni COMMIT.\n\n`, { flag: 'wx' });
  return filename;
}
