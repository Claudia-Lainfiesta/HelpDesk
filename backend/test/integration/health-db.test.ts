import request from 'supertest';
import type pg from 'pg';
import { afterAll, expect, it, vi } from 'vitest';

const databaseUrl = process.env.DATABASE_URL?.trim();
const skipReason =
  'SKIP: /api/health/db requiere DATABASE_URL exportada; no se carga backend/.env automáticamente en esta prueba.';
let pool: pg.Pool | undefined;

if (!databaseUrl) console.info(skipReason);

afterAll(async () => {
  await pool?.end();
});

it.skipIf(!databaseUrl)(
  databaseUrl ? 'GET /api/health/db consulta PostgreSQL real y responde 200' : skipReason,
  async () => {
    const url = new URL(databaseUrl!);
    vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:4200');
    vi.stubEnv('POSTGRES_USER', decodeURIComponent(url.username));
    vi.stubEnv('POSTGRES_PASSWORD', decodeURIComponent(url.password));
    vi.stubEnv('POSTGRES_DB', url.pathname.slice(1));
    const { app } = await import('../../src/app.js');
    ({ pool } = await import('../../src/db/pool.js'));

    const response = await request(app).get('/api/health/db');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'helpdesk-db' });
  },
);
