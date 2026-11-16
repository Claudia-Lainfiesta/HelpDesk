import express from 'express';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { databaseUrl } from '../../src/config/database.js';
import { serveFrontend } from '../../src/frontend.js';
import { notFound } from '../../src/middlewares/notFound.js';

describe('PostgreSQL de producción', () => {
  const uri = 'postgresql://usuario:valor-ficticio@pooler.example.invalid:5432/postgres';
  it('activa TLS con CA y hostname verificados para URI sin modo o require; conserva sslrootcert', () => {
    for (const query of ['', '?sslmode=require', '?sslmode=verify-full'])
      expect(new URL(databaseUrl(uri + query, true)).searchParams.get('sslmode')).toBe(
        'verify-full',
      );
    const result = new URL(databaseUrl(uri + '?sslrootcert=%2Fetc%2Fsecrets%2Fca.crt', true));
    expect(result.searchParams.get('sslrootcert')).toBe('/etc/secrets/ca.crt');
  });
  it.each(['disable', 'prefer', 'allow', 'no-verify', 'verify-ca'])(
    'rechaza TLS insuficiente: %s, sin revelar la URI',
    (mode) => {
      expect(() => databaseUrl(uri + '?sslmode=' + mode, true)).toThrow('TLS');
      try {
        databaseUrl(uri + '?sslmode=' + mode, true);
      } catch (error) {
        expect(String(error)).not.toContain('valor-ficticio');
      }
    },
  );
  it('no altera PostgreSQL local y rechaza URI inválida o SSL desactivado en producción', () => {
    expect(databaseUrl(uri, false)).toBe(uri);
    expect(() => databaseUrl(uri + '?ssl=false', true)).toThrow('TLS');
    expect(() => databaseUrl('no es una URI', false)).toThrow('DATABASE_URL');
  });
});

describe('Angular estático y fallback Express 5', () => {
  let directory: string;
  const app = express();
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'hd-production-'));
    await writeFile(
      join(directory, 'index.html'),
      '<!doctype html><title>HelpDesk</title><app-root></app-root>',
    );
    await writeFile(join(directory, 'main.js'), 'window.helpdesk=true;');
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.use('/api', notFound);
    serveFrontend(app, directory);
    app.use(notFound);
  });
  afterAll(async () => rm(directory, { recursive: true, force: true }));
  it.each(['/', '/tickets', '/tickets/42', '/iniciar-sesion', '/cambiar-contrasena'])(
    'resuelve la SPA en %s',
    async (path) => {
      const r = await request(app).get(path).set('Accept', 'text/html');
      expect(r.status).toBe(200);
      expect(r.type).toBe('text/html');
      expect(r.text).toContain('<app-root>');
      expect(r.headers['cache-control']).toBe('no-cache');
    },
  );
  it('resuelve assets y mantiene health/API fuera del fallback', async () => {
    expect((await request(app).get('/main.js')).type).toContain('javascript');
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
    for (const path of ['/api', '/api/inexistente', '/missing.js']) {
      const r = await request(app).get(path).set('Accept', 'text/html');
      expect(r.status).toBe(404);
      expect(r.type).toBe('application/json');
    }
    expect((await request(app).get('/tickets').set('Accept', 'application/json')).status).toBe(404);
    expect(() => serveFrontend(express(), join(directory, 'inexistente'))).toThrow(
      'build:production',
    );
  });
});
