import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

vi.mock('../../src/config/env.js', async () => ({
  env: {
    mail: (await import('../../src/mail/config.js')).parseMailConfig({
      MAIL_FROM: 'sender@example.invalid',
      RECOVERY_ADMIN_EMAIL: 'admin@example.invalid',
    }),
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
    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("script-src-attr 'none'");
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
  it('producción sirve la SPA sin consultar sesión y mantiene las rutas API protegidas', async () => {
    const frontend = await import('../../src/frontend.js');
    vi.spyOn(frontend, 'serveFrontend').mockImplementation((web) => {
      web.get('/{*ruta}', (_req, res) => res.type('html').send('<app-root></app-root>'));
    });
    const { env } = await import('../../src/config/env.js');
    const { pool } = await import('../../src/db/pool.js');
    const query = vi.mocked(pool.query);
    query.mockClear();
    const { createApp } = await import('../../src/app.js');
    const production = createApp({
      ...env,
      nodeEnv: 'production',
      frontendOrigin: 'https://helpdesk.example.invalid',
      trustProxy: 1,
    });
    const r = await request(production)
      .get('/tickets/42')
      .set('Cookie', `__Host-hd_session=${'x'.repeat(43)}`);
    expect(r.status).toBe(200);
    expect(r.type).toBe('text/html');
    expect(query).not.toHaveBeenCalled();
    expect((await request(production).get('/api/users')).status).toBe(401);
    const missing = await request(production).get('/api/inexistente').set('Accept', 'text/html');
    expect(missing.status).toBe(404);
    expect(missing.type).toBe('application/json');
    const origin = await request(production)
      .post('/api/auth/login')
      .set('Origin', 'https://otro.example.invalid')
      .send({});
    expect(origin.status).toBe(403);
    expect(origin.body.error.code).toBe('CSRF_REJECTED');
  });
});
