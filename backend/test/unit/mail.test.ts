import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseMailConfig as parseConfig } from '../../src/mail/config.js';
import { createMailer, recoverySubject } from '../../src/mail/mailer.js';
const parseMailConfig = (source: NodeJS.ProcessEnv) =>
  parseConfig({
    MAIL_FROM: 'sender@example.invalid',
    RECOVERY_ADMIN_EMAIL: 'admin@example.invalid',
    ...source,
  });
const doubles = vi.hoisted(() => ({
  create: vi.fn(),
  verify: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
}));
vi.mock('nodemailer', () => ({ createTransport: doubles.create }));
beforeEach(() => {
  doubles.create.mockReturnValue({
    verify: doubles.verify,
    sendMail: doubles.send,
    close: doubles.close,
  });
  doubles.verify.mockResolvedValue(true);
  doubles.send.mockResolvedValue({});
});

describe('Configuración SMTP', () => {
  it('admite Brevo 2525 con STARTTLS obligatorio, sin SSL implícito', () => {
    expect(
      parseMailConfig({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '2525',
        SMTP_SECURE: 'false',
        SMTP_REQUIRE_TLS: 'true',
        SMTP_USER: 'login-ficticio',
        SMTP_PASSWORD: 'valor-ficticio',
      }),
    ).toMatchObject({ host: 'smtp-relay.brevo.com', port: 2525, secure: false, requireTLS: true });
  });
  it('exige direcciones del entorno y no incrusta direcciones reales como valores predeterminados', () => {
    expect(() => parseConfig({})).toThrow('MAIL_FROM');
    expect(() => parseConfig({ MAIL_FROM: 'sender@example.invalid' })).toThrow(
      'RECOVERY_ADMIN_EMAIL',
    );
  });
  it('usa Mailpit sin autenticación por defecto', () => {
    expect(parseMailConfig({})).toMatchObject({
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      requireTLS: false,
      user: '',
      password: '',
      recoveryRateLimitPerIp: 10,
      recoveryRateLimitPerEmail: 3,
    });
  });
  it.each([
    { SMTP_PORT: '0' },
    { SMTP_PORT: '65536' },
    { SMTP_PORT: 'abc' },
    { SMTP_PORT: '1.5' },
    { MAIL_FROM: 'no-es-correo' },
    { RECOVERY_ADMIN_EMAIL: 'inválido' },
    { SMTP_USER: 'prueba' },
    { SMTP_PASSWORD: 'prueba-no-real' },
    { SMTP_SECURE: 'yes' },
    { SMTP_REQUIRE_TLS: '1' },
    { SMTP_SECURE: '' },
    { SMTP_HOST: 'smtp://host' },
    { RECOVERY_RATE_LIMIT_PER_IP: '0' },
    { RECOVERY_RATE_LIMIT_PER_EMAIL: '-1' },
  ])('rechaza configuración inválida sin divulgar valores', (source) => {
    expect(() => parseMailConfig(source)).toThrow('Configuración de correo inválida');
  });
  it('soporta TLS implícito y STARTTLS obligatorio, con login SMTP independiente del remitente', () => {
    const password = randomBytes(24).toString('base64url');
    expect(
      parseMailConfig({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_REQUIRE_TLS: 'true',
        SMTP_USER: 'login-tecnico',
        SMTP_PASSWORD: password,
      }),
    ).toMatchObject({ requireTLS: true, secure: false, user: 'login-tecnico' });
    expect(
      parseMailConfig({
        SMTP_HOST: 'correo.example.invalid',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
      }).secure,
    ).toBe(true);
    expect(() =>
      parseMailConfig({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '587',
        SMTP_USER: 'login-tecnico',
        SMTP_PASSWORD: password,
      }),
    ).toThrow('SMTP_REQUIRE_TLS');
    expect(() => parseMailConfig({ SMTP_HOST: 'smtp-relay.brevo.com' })).toThrow('SMTP_USER');
  });
});

describe('Pasarela SMTP', () => {
  it('reutiliza el transporter y no ejecuta verify al enviar', async () => {
    const config = parseMailConfig({
      SMTP_HOST: 'smtp.example.invalid',
      SMTP_PORT: '587',
      SMTP_REQUIRE_TLS: 'true',
    });
    const mailer = createMailer(config);
    const account = { id: '42', fullName: 'Empleado de prueba', email: 'empleado@example.invalid' };
    await mailer.sendRecoveryNotice(account);
    await mailer.sendRecoveryNotice(account);
    expect(doubles.create).toHaveBeenCalledTimes(1);
    expect(doubles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        host: config.host,
        port: 587,
        secure: false,
        requireTLS: true,
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        logger: false,
        debug: false,
      }),
    );
    expect(doubles.create.mock.calls.at(-1)![0]).not.toHaveProperty('auth');
    expect(doubles.verify).not.toHaveBeenCalled();
    await mailer.check();
    expect(doubles.verify).toHaveBeenCalledOnce();
    mailer.close();
    expect(doubles.close).toHaveBeenCalled();
  });
  it('incluye autenticación solo cuando ambos campos existen, sin poner secretos en el mensaje', async () => {
    const password = randomBytes(24).toString('base64url');
    const config = parseMailConfig({
      SMTP_USER: 'usuario-tecnico',
      SMTP_PASSWORD: password,
      MAIL_FROM: 'remitente@example.invalid',
      RECOVERY_ADMIN_EMAIL: 'administracion@example.invalid',
    });
    const mailer = createMailer(config);
    // Propiedades extra nunca pasan a la plantilla de correo.
    const account = {
      id: '7',
      fullName: 'Empleado de prueba',
      email: 'empleado@example.invalid',
      temporaryPassword: randomBytes(16).toString('hex'),
      password_hash: randomBytes(32).toString('hex'),
      cookie: randomBytes(32).toString('hex'),
    };
    await mailer.sendRecoveryNotice(account);
    expect(doubles.create.mock.calls.at(-1)![0].auth).toEqual({
      user: config.user,
      pass: password,
    });
    const message = doubles.send.mock.calls.at(-1)![0];
    expect(message).toMatchObject({
      from: config.from,
      to: config.recoveryAdminEmail,
      subject: recoverySubject,
    });
    expect(message.text).toContain(account.fullName);
    expect(message.text).toContain(account.email);
    expect(message).not.toHaveProperty('html');
    for (const secret of [
      password,
      account.temporaryPassword,
      account.password_hash,
      account.cookie,
    ])
      expect(JSON.stringify(message)).not.toContain(secret);
    expect(message.text).toContain('medio distinto del correo');
    expect(message.text).not.toContain('http');
  });
});
