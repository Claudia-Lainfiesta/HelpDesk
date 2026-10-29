import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { parseAuthConfig } from '../../src/auth/config.js';
import { sessionCookie } from '../../src/auth/session.js';
import { csrfProtection } from '../../src/auth/middlewares.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

vi.mock('../../src/config/env.js', () => ({ env: {} }));
vi.mock('../../src/db/pool.js', () => ({ pool: { query: vi.fn() } }));

const config = { ...parseAuthConfig({}), frontendOrigin: 'http://localhost:4200', nodeEnv: 'test' };

it('valida los límites y no confía indiscriminadamente en proxies', () => {
  expect(config).toMatchObject({
    sessionIdleMinutes: 30,
    sessionAbsoluteHours: 8,
    loginMaxAttempts: 5,
    loginLockMinutes: 15,
    trustProxy: false,
  });
  expect(parseAuthConfig({ TRUST_PROXY: '1' }).trustProxy).toBe(1);
  for (const source of [
    { SESSION_IDLE_MINUTES: '0' },
    { LOGIN_MAX_ATTEMPTS: '-1' },
    { TRUST_PROXY: 'true' },
  ]) {
    expect(() => parseAuthConfig(source)).toThrow('Configuración de autenticación inválida');
  }
});

it('emite las banderas de cookie y el prefijo Host solo en producción', async () => {
  for (const nodeEnv of ['test', 'production']) {
    const app = express();
    const cookie = sessionCookie({ nodeEnv });
    app.get('/', (_req, res) => {
      res.cookie(cookie.name, 'prueba', cookie.options).end();
    });
    const response = await request(app).get('/');
    const header = (response.headers['set-cookie'] as string[] | undefined)?.[0] ?? '';
    expect(header.includes('HttpOnly')).toBe(true);
    expect(header.includes('SameSite=Lax')).toBe(true);
    expect(header.includes('Path=/')).toBe(true);
    expect(header.includes('Secure')).toBe(nodeEnv === 'production');
    expect(header.startsWith('__Host-')).toBe(nodeEnv === 'production');
    expect(header.includes('Domain=')).toBe(false);
  }
});

it('CSRF usa Origin, o Referer si falta, y exige JSON', async () => {
  const app = express();
  app.use(csrfProtection(config));
  app.post('/test', (_req, res) => res.sendStatus(204));
  app.use(errorHandler);
  expect((await request(app).post('/test').send({})).status).toBe(403);
  expect(
    (
      await request(app)
        .post('/test')
        .set('Origin', 'https://otro.invalid')
        .set('Referer', `${config.frontendOrigin}/`)
        .send({})
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/test')
        .set('Origin', '')
        .set('Referer', `${config.frontendOrigin}/`)
        .send({})
    ).status,
  ).toBe(403);
  expect(
    (await request(app).post('/test').set('Referer', `${config.frontendOrigin}/pantalla`).send({}))
      .status,
  ).toBe(204);
  expect(
    (await request(app).post('/test').set('Origin', config.frontendOrigin).send('texto')).status,
  ).toBe(415);
});
