import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../src/config/env.js', () => ({
  env: {
    frontendOrigin: 'http://localhost:4200',
    nodeEnv: 'test',
    trustProxy: false,
    sessionIdleMinutes: 30,
    sessionAbsoluteHours: 8,
    loginMaxAttempts: 5,
    loginLockMinutes: 15,
    loginRateLimitPerIp: 30,
  },
}));
vi.mock('../../src/db/pool.js', () => ({ pool: { query: vi.fn() } }));

let app: Express;
beforeAll(async () => {
  ({ app } = await import('../../src/app.js'));
});

describe('API base', () => {
  it('GET /api/health responde 200 y status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'helpdesk-api' });
    expect(Number.isNaN(Date.parse(response.body.time))).toBe(false);
  });

  it('una ruta inexistente devuelve el JSON de notFound', async () => {
    const response = await request(app).get('/ruta-inexistente');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
  });

  it('incluye CORS para el origen permitido', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:4200');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('omite CORS para un origen no permitido', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://otro.example');
    expect(response.status).toBe(200);
    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
  });
});
