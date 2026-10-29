import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import pg from 'pg';
import { env } from '../src/config/env.js';
import { advisoryLockKeys, assertLocalDevelopment } from '../src/db/commands.js';
import {
  createMigration,
  loadMigrations,
  migrate,
  verifyMigrations,
} from '../src/db/migrations.js';

test('herramientas de base de datos', { timeout: 30000 }, async (t) => {
  assertLocalDevelopment(env.nodeEnv, env.databaseUrl);
  const directoryPath = await mkdtemp(join(tmpdir(), 'helpdesk-migrations-'));
  const directory = pathToFileURL(`${directoryPath}/`);
  const databaseName = `helpdesk_tools_test_${process.pid}`;
  const admin = new pg.Client({ connectionString: env.databaseUrl });
  const testUrl = new URL(env.databaseUrl);
  testUrl.pathname = `/${databaseName}`;
  const client = new pg.Client({ connectionString: testUrl.toString() });
  let created = false;
  let connected = false;

  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await client.connect();
    connected = true;

    await t.test('protecciones de entorno y host', () => {
      for (const nodeEnv of ['production', 'test']) {
        assert.throws(
          () => assertLocalDevelopment(nodeEnv, testUrl.toString()),
          /Operación rechazada/,
        );
      }
      for (const url of [
        'postgresql://u:p@db.example/helpdesk',
        'postgresql://u:p@localhost/helpdesk?host=db.example',
        'postgresql://u:p@localhost/helpdesk?hostaddr=203.0.113.1',
      ])
        assert.throws(() => assertLocalDevelopment('development', url), /Operación rechazada/);
      assert.doesNotThrow(() => assertLocalDevelopment('development', testUrl.toString()));
    });

    await t.test(
      'reset y seed se rechazan desde el CLI antes de conectar a producción o a un host remoto',
      async () => {
        for (const command of ['reset', 'seed']) {
          for (const overrides of [
            { NODE_ENV: 'production', DATABASE_URL: testUrl.toString() },
            { NODE_ENV: 'development', DATABASE_URL: 'postgresql://u:p@db.example/helpdesk' },
          ]) {
            const child = spawn(process.execPath, ['--import', 'tsx', 'src/db/cli.ts', command], {
              cwd: new URL('../', import.meta.url),
              env: { ...process.env, ...overrides },
              stdio: ['ignore', 'pipe', 'pipe'],
            });
            let output = '';
            child.stderr.on('data', (chunk) => {
              output += chunk;
            });
            const [code] = await once(child, 'exit');
            assert.equal(code, 1, output);
            assert.match(output, /Operación rechazada/);
          }
        }
      },
    );

    await t.test(
      'db:up informa éxito saludable y rechaza estados unhealthy, detenido o fallo de Compose',
      async () => {
        const shim = join(directoryPath, 'podman');
        await writeFile(
          shim,
          `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'compose' && args[1] === 'up') process.exit(process.env.FAKE_PODMAN_STATE === 'compose_failure' ? 125 : 0);
if (args[0] === 'compose' && args[1] === 'ps') { console.log('a'.repeat(64)); process.exit(0); }
if (args[0] === 'inspect' && args[2].includes('Labels')) { console.log(JSON.stringify({ 'com.docker.compose.service': 'postgres' })); process.exit(0); }
console.log(JSON.stringify({ Running: process.env.FAKE_PODMAN_STATE !== 'stopped', Status: 'running', Health: { Status: process.env.FAKE_PODMAN_STATE } }));
`,
          { mode: 0o700 },
        );
        for (const state of ['healthy', 'unhealthy', 'stopped', 'compose_failure']) {
          const child = spawn(process.execPath, ['--import', 'tsx', 'src/db/up.ts'], {
            cwd: new URL('../', import.meta.url),
            env: {
              ...process.env,
              PATH: `${directoryPath}:${process.env.PATH}`,
              FAKE_PODMAN_STATE: state,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let output = '';
          child.stdout.on('data', (chunk) => {
            output += chunk;
          });
          child.stderr.on('data', (chunk) => {
            output += chunk;
          });
          const [code] = await once(child, 'exit');
          assert.equal(code, state === 'healthy' ? 0 : 1, output);
        }
      },
    );

    await t.test('creación de archivo numerado sin sobrescribir', async () => {
      assert.equal(await createMigration('Primera prueba', directory), '0001_primera_prueba.sql');
      assert.equal(await createMigration('Segunda acción', directory), '0002_segunda_accion.sql');
      await rm(new URL('0002_segunda_accion.sql', directory));
      await writeFile(
        new URL('0001_primera_prueba.sql', directory),
        'CREATE TABLE test_first (id integer PRIMARY KEY);',
      );
    });

    await t.test('aplicación y segunda ejecución sin cambios', async () => {
      const migrations = await loadMigrations(directory);
      await migrate(client, migrations);
      await migrate(client, migrations);
      const { rows } = await client.query('SELECT count(*)::int AS count FROM schema_migrations');
      assert.equal(rows[0].count, 1);
    });

    await t.test('rechazo de checksum alterado y archivo aplicado ausente', async () => {
      const migrations = await loadMigrations(directory);
      const first = migrations[0]!;
      await assert.rejects(migrate(client, [{ ...first, checksum: '0'.repeat(64) }]), /inmutables/);
      await assert.rejects(verifyMigrations(client, []), /Falta el archivo/);
    });

    await t.test('rollback del SQL fallido y detención antes del siguiente archivo', async () => {
      await writeFile(
        new URL('0002_falla.sql', directory),
        'CREATE TABLE should_rollback (id integer); SELECT * FROM missing_table;',
      );
      await writeFile(
        new URL('0003_no_ejecutar.sql', directory),
        'CREATE TABLE should_not_run (id integer);',
      );
      await assert.rejects(
        migrate(client, await loadMigrations(directory)),
        /Falló 0002_falla.sql/,
      );
      const { rows } = await client.query(
        "SELECT to_regclass('should_rollback') AS rolled_back, to_regclass('should_not_run') AS not_run",
      );
      assert.equal(rows[0].rolled_back, null);
      assert.equal(rows[0].not_run, null);
      assert.equal(
        (await client.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
        1,
      );
    });

    await t.test('SQL y registro de migración se revierten juntos', async () => {
      await rm(new URL('0002_falla.sql', directory));
      await rm(new URL('0003_no_ejecutar.sql', directory));
      await writeFile(
        new URL('0002_ledger_conflict.sql', directory),
        `
        CREATE TABLE ledger_atomic (id integer);
        INSERT INTO schema_migrations (filename, checksum) VALUES ('0002_ledger_conflict.sql', 'conflict');
      `,
      );
      await assert.rejects(
        migrate(client, await loadMigrations(directory)),
        /Falló 0002_ledger_conflict.sql/,
      );
      assert.equal(
        (await client.query("SELECT to_regclass('ledger_atomic') AS name")).rows[0].name,
        null,
      );
      assert.equal(
        (await client.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
        1,
      );
    });

    await t.test('el ejecutor espera al advisory lock y lo libera al terminar', async () => {
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await client.query('SELECT pg_advisory_lock($1, $2)', [...advisoryLockKeys]);
      const child = spawn(process.execPath, ['--import', 'tsx', 'src/db/cli.ts', 'migrate'], {
        cwd: new URL('../', import.meta.url),
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      const exit = once(child, 'exit');
      try {
        let waiting = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          const { rows } = await client.query(
            `
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname = $1 AND application_name = 'helpdesk-db-cli' AND wait_event = 'advisory'
          `,
            [databaseName],
          );
          if (rows[0].count === 1) {
            waiting = true;
            break;
          }
          await delay(50);
        }
        assert.equal(waiting, true, output);
        assert.equal(child.exitCode, null);
        await client.query('SELECT pg_advisory_unlock($1, $2)', [...advisoryLockKeys]);
        const [code] = await exit;
        assert.equal(code, 0, output);
        assert.equal(
          (await client.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0]
            .count,
          (await loadMigrations()).length,
        );
        const result = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [
          ...advisoryLockKeys,
        ]);
        assert.equal(result.rows[0].locked, true);
      } finally {
        await client.query('SELECT pg_advisory_unlock_all()');
        if (child.exitCode === null) {
          child.kill('SIGKILL');
          await exit;
        }
      }
    });
  } finally {
    if (connected) await client.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
    await rm(directoryPath, { recursive: true, force: true });
  }
});
