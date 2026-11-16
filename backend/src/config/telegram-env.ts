export class TelegramConfigurationError extends Error {}

export interface TelegramConfig {
  token: string | undefined;
  supportChatId?: string;
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
  return {
    token,
    ...(supportChatId ? { supportChatId } : {}),
  };
}
