import { expect, it, vi } from 'vitest';
import { parseTelegramEnv } from '../../src/config/telegram-env.js';

it('Telegram es opcional para la API', () => {
  const config = parseTelegramEnv({});
  expect(config).toEqual({ token: undefined });
});
it('valida las variables sin incluir valores privados en los errores', () => {
  expect(() => parseTelegramEnv({ TELEGRAM_BOT_TOKEN: 'VALOR_PRIVADO' })).toThrow(
    'TELEGRAM_BOT_TOKEN tiene un formato inválido',
  );
  try {
    parseTelegramEnv({ TELEGRAM_BOT_TOKEN: 'VALOR_PRIVADO' });
  } catch (error) {
    expect(String(error)).not.toContain('VALOR_PRIVADO');
  }
  const synthetic = `${123456789}:${'x'.repeat(35)}`;
  expect(parseTelegramEnv({ TELEGRAM_BOT_TOKEN: synthetic }).token).toBe(synthetic);
  expect(parseTelegramEnv({ TELEGRAM_SUPPORT_CHAT_ID: '-1001234567890' }).supportChatId).toBe(
    '-1001234567890',
  );
});
it.each(['1', 'abc', '-1.5', '0', '-9007199254740992'])(
  'rechaza un ID de grupo inválido: %s',
  (value) => {
    expect(() => parseTelegramEnv({ TELEGRAM_SUPPORT_CHAT_ID: value })).toThrow(
      'ID numérico negativo',
    );
  },
);
it('config/env.ts arranca sin token de Telegram', async () => {
  vi.resetModules();
  vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
  vi.stubEnv('DATABASE_URL', 'postgresql://unit_test:unit_test@localhost:5432/unit_test');
  vi.stubEnv('POSTGRES_USER', 'unit_test');
  vi.stubEnv('POSTGRES_PASSWORD', 'unit_test');
  vi.stubEnv('MAIL_FROM', 'sender@example.invalid');
  vi.stubEnv('RECOVERY_ADMIN_EMAIL', 'admin@example.invalid');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
  const { env } = await import('../../src/config/env.js');
  expect(env.telegram.token).toBeUndefined();
});
