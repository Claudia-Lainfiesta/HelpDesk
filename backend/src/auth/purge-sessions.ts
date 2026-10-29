import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { purgeSessions } from './service.js';

try {
  const count = await purgeSessions(env.sessionIdleMinutes);
  console.info(`Sesiones antiguas eliminadas: ${count}.`);
} catch {
  console.error('No se pudo completar la purga de sesiones.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
