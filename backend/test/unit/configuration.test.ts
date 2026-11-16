import express from 'express';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';

// Estas pruebas no leen la configuración privada del desarrollador.
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MAIL_FROM', 'sender@example.invalid');
  vi.stubEnv('RECOVERY_ADMIN_EMAIL', 'admin@example.invalid');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PORT', '3000');
  vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:4200');
  vi.stubEnv('POSTGRES_USER', 'unit_test');
  vi.stubEnv('POSTGRES_PASSWORD', 'unit_test');
  vi.stubEnv('POSTGRES_DB', 'helpdesk_unit_test');
  vi.stubEnv('DATABASE_URL', 'postgresql://unit_test:unit_test@localhost:5432/helpdesk_unit_test');
});

it('config/env.ts falla claramente si falta DATABASE_URL', async () => {
  vi.stubEnv('DATABASE_URL', undefined);
  await expect(import('../../src/config/env.js')).rejects.toThrow('falta la variable DATABASE_URL');
});
it('producción usa PORT/0.0.0.0, HTTPS, proxy explícito y no exige credenciales de Compose', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('PORT', '10000');
  vi.stubEnv('FRONTEND_ORIGIN', 'https://helpdesk.example.invalid');
  vi.stubEnv('TRUST_PROXY', '1');
  for (const name of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'])
    vi.stubEnv(name, undefined);
  const { env } = await import('../../src/config/env.js');
  expect(env).toMatchObject({
    port: 10000,
    host: '0.0.0.0',
    frontendOrigin: 'https://helpdesk.example.invalid',
    trustProxy: 1,
  });
  expect(new URL(env.databaseUrl).searchParams.get('sslmode')).toBe('verify-full');
});
it.each([undefined, 'http://localhost:4200'])(
  'producción exige un origen HTTPS explícito: %s',
  async (origin) => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_ORIGIN', origin);
    await expect(import('../../src/config/env.js')).rejects.toThrow('FRONTEND_ORIGIN');
  },
);

it('errorHandler omite el stack cuando NODE_ENV=production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
  const app = express();
  app.get('/error-de-prueba', () => {
    throw new Error('Detalle interno confidencial');
  });
  app.use(errorHandler);

  const response = await request(app).get('/error-de-prueba');
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
  });
  expect(response.text).not.toContain('Detalle interno confidencial');
  expect(response.body).not.toHaveProperty('stack');
  expect(log).toHaveBeenCalled();
});
