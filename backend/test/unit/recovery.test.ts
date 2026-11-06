import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { parseAuthConfig } from '../../src/auth/config.js';
import { parseMailConfig } from '../../src/mail/config.js';
import { recoveryEmailKey, recoveryResponse } from '../../src/auth/recovery/routes.js';
import { pool } from '../../src/db/pool.js';
import { recordAudit } from '../../src/audit/audit.js';

vi.mock('../../src/config/env.js', async () => ({
  env: {
    mail: (await import('../../src/mail/config.js')).parseMailConfig({
      MAIL_FROM: 'sender@example.invalid',
      RECOVERY_ADMIN_EMAIL: 'admin@example.invalid',
    }),
    frontendOrigin: 'http://localhost:4200',
    nodeEnv: 'test',
    trustProxy: false,
    loginRateLimitPerIp: 30,
  },
}));
vi.mock('../../src/db/pool.js', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../src/mail/default.js', () => ({ mailer: { sendRecoveryNotice: vi.fn() } }));
const origin = 'http://localhost:4200';
const account = { id: '42', fullName: 'Persona de prueba', email: 'persona@example.invalid' };
const register = vi.fn();
const send = vi.fn();
function app(limits: NodeJS.ProcessEnv = {}, trustProxy: number | false = false) {
  return createApp(
    {
      ...parseAuthConfig({}),
      frontendOrigin: origin,
      nodeEnv: 'test',
      trustProxy,
      mail: parseMailConfig({
        MAIL_FROM: 'sender@example.invalid',
        RECOVERY_ADMIN_EMAIL: 'admin@example.invalid',
        ...limits,
      }),
    },
    { register, send },
  );
}
const path = '/api/auth/recovery-request';
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
beforeEach(() => {
  register.mockReset().mockResolvedValue(null);
  send.mockReset().mockResolvedValue(undefined);
  vi.mocked(pool.query).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Solicitud pública de recuperación', () => {
  it('exige JSON y origen permitido sin consultar cuentas', async () => {
    const api = app();
    expect((await request(api).post(path).send({ email: account.email })).status).toBe(403);
    expect(
      (
        await request(api)
          .post(path)
          .set('Origin', 'https://otro.invalid')
          .send({ email: account.email })
      ).status,
    ).toBe(403);
    expect((await request(api).post(path).set('Origin', origin).send('texto')).status).toBe(415);
    expect(register).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { email: 'sin-formato' },
    { email: 'a'.repeat(255) + '@example.invalid' },
    { email: account.email, password: 'no-permitido' },
  ])('valida sintaxis sin enumerar', async (body) => {
    const response = await request(app()).post(path).set('Origin', origin).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    expect(register).not.toHaveBeenCalled();
  });
  it('no exige sesión, normaliza el correo y no carga ni actualiza sesiones aunque haya cookie', async () => {
    register.mockResolvedValue(account);
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = await request(app())
      .post(path)
      .set('Origin', origin)
      .set('Cookie', `hd_session=${randomBytes(32).toString('base64url')}`)
      .send({ email: ' Persona@EXAMPLE.INVALID ' });
    expect(response.status).toBe(202);
    expect(response.body).toEqual(recoveryResponse);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(register).toHaveBeenCalledWith(account.email, expect.any(String));
    expect(pool.query).not.toHaveBeenCalled();
    await settle();
    expect(send).toHaveBeenCalledExactlyOnceWith(account);
    log.mockRestore();
  });
  it('da exactamente el mismo 202 y cuerpo con y sin cuenta elegible', async () => {
    const api = app();
    register.mockResolvedValueOnce(account).mockResolvedValue(null);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const local = await request(api)
      .post(path)
      .set('Origin', origin)
      .send({ email: account.email });
    const missing = await request(api)
      .post(path)
      .set('Origin', origin)
      .send({ email: 'inexistente@example.invalid' });
    expect(local.status).toBe(202);
    expect(missing.status).toBe(local.status);
    expect(missing.body).toEqual(local.body);
    await settle();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('responde antes de que termine SMTP', async () => {
    let finish!: () => void;
    send.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    register.mockResolvedValue(account);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = await request(app())
      .post(path)
      .set('Origin', origin)
      .send({ email: account.email });
    expect(response.status).toBe(202);
    await settle();
    expect(send).toHaveBeenCalledOnce();
    finish();
    await settle();
  });
  it('absorbe rechazo SMTP sin unhandledRejection ni datos originales en logs', async () => {
    const secret = randomBytes(24).toString('hex');
    const original = `Error SMTP ${account.email} ${account.fullName} ${secret}`;
    send.mockRejectedValue(new Error(original));
    register.mockResolvedValue(account);
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const response = await request(app())
        .post(path)
        .set('Origin', origin)
        .send({ email: account.email });
      expect(response.body).toEqual(recoveryResponse);
      expect(response.status).toBe(202);
      await settle();
      await settle();
      expect(unhandled).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('mail.recovery_delivery', {
        userId: account.id,
        result: 'failed',
      });
      for (const value of [secret, account.email, account.fullName, original])
        expect(JSON.stringify(log.mock.calls)).not.toContain(value);
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
  it('solo programa correo después de que termine el registro y no acepta si falla la auditoría', async () => {
    register.mockRejectedValue(new Error('fallo interno de almacenamiento'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await request(app())
      .post(path)
      .set('Origin', origin)
      .send({ email: account.email });
    expect(response.status).toBe(500);
    expect(response.text).not.toContain('fallo interno');
    await settle();
    expect(send).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('registra actor anónimo con IP independiente y metadatos vacíos', async () => {
    const client = { query: vi.fn() };
    await recordAudit(client, {
      actor: null,
      ip: '127.0.0.1',
      action: 'auth.recovery_requested',
      targetType: 'user',
      targetId: '42',
    });
    expect(client.query.mock.calls[0]![1]).toEqual([
      null,
      'auth.recovery_requested',
      'user',
      '42',
      '{}',
      '127.0.0.1',
    ]);
  });
});

describe('Límites de recuperación', () => {
  it('limita por IP independientemente del login', async () => {
    const api = app({ RECOVERY_RATE_LIMIT_PER_IP: '2' });
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(api)
            .post(path)
            .set('Origin', origin)
            .send({ email: `persona${i}@example.invalid` })
        ).status,
      ).toBe(202);
    const limited = await request(api)
      .post(path)
      .set('Origin', origin)
      .send({ email: 'tercero@example.invalid' });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RECOVERY_RATE_LIMIT');
    expect(register).toHaveBeenCalledTimes(2);
  });
  it('limita correos normalizados inexistentes incluso desde distintas IP y renueva la ventana', async () => {
    const api = app({ RECOVERY_RATE_LIMIT_PER_IP: '100', RECOVERY_RATE_LIMIT_PER_EMAIL: '3' }, 1);
    for (let i = 0; i < 4; i++) {
      const r = await request(api)
        .post(path)
        .set('Origin', origin)
        .set('X-Forwarded-For', `192.0.2.${i + 1}`)
        .send({ email: i % 2 ? ' AUSENTE@EXAMPLE.INVALID ' : 'ausente@example.invalid' });
      expect(r.status).toBe(i < 3 ? 202 : 429);
    }
    expect(register).toHaveBeenCalledTimes(3);
    expect(send).not.toHaveBeenCalled();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 61 * 60000);
    expect(
      (
        await request(api)
          .post(path)
          .set('Origin', origin)
          .set('X-Forwarded-For', '192.0.2.8')
          .send({ email: 'ausente@example.invalid' })
      ).status,
    ).toBe(202);
  });
  it('las claves son SHA-256 estables y nunca contienen el correo', () => {
    expect(recoveryEmailKey(' Persona@EXAMPLE.INVALID ')).toBe(recoveryEmailKey(account.email));
    expect(recoveryEmailKey(account.email)).toMatch(/^[a-f\d]{64}$/);
    expect(recoveryEmailKey(account.email)).not.toContain(account.email);
  });
});
