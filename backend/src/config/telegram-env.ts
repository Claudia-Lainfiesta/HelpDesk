import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

export class TelegramConfigurationError extends Error {}

export interface TelegramConfig {
  token: string | undefined;
  supportChatId?: string;
  allowedUserIds: readonly number[];
}

export function parseTelegramEnv(source: NodeJS.ProcessEnv): TelegramConfig {
  const token = source['TELEGRAM_BOT_TOKEN']?.trim() || undefined;
  if (token && !/^[1-9]\d*:[A-Za-z0-9_-]{30,}$/.test(token)) {
    throw new TelegramConfigurationError(
      'TELEGRAM_BOT_TOKEN tiene un formato inválido. Revisa su valor local sin compartirlo.',
    );
  }
  const supportChatId = source['TELEGRAM_SUPPORT_CHAT_ID']?.trim();
  if (
    supportChatId &&
    (!/^-[1-9]\d*$/.test(supportChatId) || !Number.isSafeInteger(Number(supportChatId)))
  ) {
    throw new TelegramConfigurationError(
      'TELEGRAM_SUPPORT_CHAT_ID debe ser el ID numérico negativo de un grupo o supergrupo.',
    );
  }
  const rawIds = source['TELEGRAM_ALLOWED_USER_IDS']?.trim();
  const allowedUserIds = rawIds
    ? rawIds.split(',').map((part) => {
        const value = part.trim();
        const id = Number(value);
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
          throw new TelegramConfigurationError(
            'TELEGRAM_ALLOWED_USER_IDS debe contener IDs enteros positivos separados por comas.',
          );
        }
        return id;
      })
    : [];
  return {
    token,
    ...(supportChatId ? { supportChatId } : {}),
    allowedUserIds: [...new Set(allowedUserIds)],
  };
}

export function loadTelegramEnv(): TelegramConfig {
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
  return parseTelegramEnv(process.env);
}

export function requireTelegramToken(config: TelegramConfig): string {
  if (!config.token) {
    throw new TelegramConfigurationError(
      'Falta TELEGRAM_BOT_TOKEN. Configúralo localmente para ejecutar los scripts del bot; la API no lo necesita.',
    );
  }
  return config.token;
}
