import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
const exec = promisify(execFile);

async function podmanOutput(args: string[]): Promise<string> {
  const { stdout } = await exec('podman', args, { cwd: backendRoot, timeout: 15000 });
  return stdout.trim();
}

async function main(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('podman', ['compose', 'up', '-d', 'postgres'], {
      cwd: backendRoot,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`podman compose up falló (${signal ?? code}).`));
    });
  });

  // podman-compose 1.6 no admite filtrar por servicio en `compose ps`.
  const ids = (await podmanOutput(['compose', 'ps', '-q']))
    .split(/\r?\n/)
    .filter((id) => /^[a-f0-9]{12,64}$/.test(id));
  const postgresIds: string[] = [];
  for (const id of ids) {
    const labels = JSON.parse(
      await podmanOutput(['inspect', '--format', '{{json .Config.Labels}}', id]),
    ) as Record<string, string>;
    if (
      (labels['com.docker.compose.service'] ?? labels['io.podman.compose.service']) === 'postgres'
    ) {
      postgresIds.push(id);
    }
  }
  if (postgresIds.length !== 1 || !postgresIds[0]) {
    throw new Error('No se pudo identificar un único contenedor del servicio postgres.');
  }
  const containerId = postgresIds[0];
  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    const state = JSON.parse(
      await podmanOutput(['inspect', '--format', '{{json .State}}', containerId]),
    ) as { Running: boolean; Status: string; Health?: { Status?: string } };
    if (!state.Running) {
      throw new Error(
        `PostgreSQL no está corriendo (estado: ${state.Status}). Revisa npm run db:logs.`,
      );
    }
    if (state.Health?.Status === 'healthy') {
      console.log('PostgreSQL está healthy y disponible en 127.0.0.1:5432.');
      return;
    }
    if (!state.Health?.Status || state.Health.Status === 'unhealthy') {
      throw new Error(
        'PostgreSQL no tiene un healthcheck válido o está unhealthy. Revisa npm run db:logs.',
      );
    }
    await delay(1000);
  }
  throw new Error('PostgreSQL no llegó a healthy en 90 segundos. Revisa npm run db:logs.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo iniciar PostgreSQL.');
  process.exitCode = 1;
});
