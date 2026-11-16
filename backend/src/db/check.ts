import { pool } from './pool.js';

try {
  await pool.query('SELECT 1');
  console.info('PostgreSQL: conexión comprobada. No se modificaron datos.');
} catch {
  console.error(
    'No se pudo conectar con PostgreSQL. Revisa DATABASE_URL, acceso de red y el certificado TLS, sin compartir credenciales.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
