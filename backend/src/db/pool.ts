import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  connectionTimeoutMillis: 3000,
  query_timeout: 3000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (error: Error) => {
  console.error('Error en una conexión inactiva de PostgreSQL:', error.message);
});
