import { expect, it, vi } from 'vitest';
import { parseTelegramEnv, requireTelegramToken } from '../../src/config/telegram-env.js';

it('Telegram es opcional para la API y obligatorio solo para los scripts del bot', () => {
  const config = parseTelegramEnv({});
  expect(config).toEqual({ token: undefined, allowedUserIds: [] });
  expect(() => requireTelegramToken(config)).toThrow('Falta TELEGRAM_BOT_TOKEN');
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
  expect(requireTelegramToken(parseTelegramEnv({ TELEGRAM_BOT_TOKEN: synthetic }))).toBe(synthetic);
  expect(parseTelegramEnv({ TELEGRAM_ALLOWED_USER_IDS: ' 1,2,1 ' }).allowedUserIds).toEqual([1, 2]);
  expect(parseTelegramEnv({ TELEGRAM_ALLOWED_USER_IDS: ' ' }).allowedUserIds).toEqual([]);
});
it.each(['1,', 'abc', '-1', '1.5', '0', '9007199254740992'])(
  'rechaza una lista de IDs inválida: %s',
  (value) => {
    expect(() => parseTelegramEnv({ TELEGRAM_ALLOWED_USER_IDS: value })).toThrow(
      'IDs enteros positivos',
    );
  },
);
it('config/env.ts arranca sin token de Telegram', async () => {
  vi.resetModules();
  vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
  vi.stubEnv('DATABASE_URL', 'postgresql://unit_test:unit_test@localhost:5432/unit_test');
  vi.stubEnv('POSTGRES_USER', 'unit_test');
  vi.stubEnv('POSTGRES_PASSWORD', 'unit_test');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
  vi.stubEnv('TELEGRAM_ALLOWED_USER_IDS', '');
  const { env } = await import('../../src/config/env.js');
  expect(env.telegram.token).toBeUndefined();
});
