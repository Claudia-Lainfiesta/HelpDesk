import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import test from 'node:test';

test('un puerto ocupado termina con código 1 sin anunciar disponibilidad', { timeout: 10000 }, async () => {
  const blocker = createServer();
  blocker.listen(0, '127.0.0.1');
  await once(blocker, 'listening');
  const address = blocker.address();
  assert.ok(address && typeof address !== 'string');
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: String(address.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  try {
    const [code] = await once(child, 'exit');
    assert.equal(code, 1);
    assert.match(stderr, new RegExp(`el puerto ${address.port} ya está en uso`));
    assert.doesNotMatch(stdout, /API disponible/);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
    blocker.close();
  }
});
