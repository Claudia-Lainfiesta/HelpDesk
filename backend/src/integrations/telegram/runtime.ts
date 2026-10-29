import { Api } from 'grammy';
import type { Bot } from 'grammy';
import type { AbortSignal } from 'abort-controller';
import { TelegramConfigurationError } from '../../config/telegram-env.js';
import { telegramErrorCode } from './relay/relay.js';

export class TelegramRuntimeError extends Error {}

const conflictMessage =
  'Conflicto 409: otro proceso puede estar usando el mismo bot con polling o puede haber un webhook activo. Detén la otra instancia y revisa npm run telegram:check; si procede, usa npm run telegram:check -- --delete-webhook.';

export function describeTelegramFailure(error: unknown): string {
  if (error instanceof TelegramConfigurationError || error instanceof TelegramRuntimeError) {
    return error.message;
  }
  const code = telegramErrorCode(error);
  if (code === 409) return conflictMessage;
  if (code === 401)
    return 'Telegram rechazó las credenciales (401). Revisa el token local sin compartirlo.';
  if (code === 429)
    return 'Telegram limitó las solicitudes (429). No se reintentará automáticamente.';
  return `No se pudo completar la comunicación con Telegram${code ? ` (${code})` : ''}. No se reintentará automáticamente. Se omiten los detalles por privacidad.`;
}

export function createTelegramApi(token: string): Api {
  return new Api(token, { timeoutSeconds: 40, sensitiveLogs: false });
}

export function safeBotUsername(username: string | undefined): string {
  return username && /^[A-Za-z0-9_]+$/.test(username) ? `@${username}` : '(sin nombre de usuario)';
}

export async function runLongPolling(bot: Bot, signal: AbortSignal): Promise<void> {
  // bot.init/start reintentan solicitudes y start elimina el webhook. Aquí ambas decisiones son explícitas.
  bot.botInfo = await bot.api.getMe(signal);
  const webhook = await bot.api.getWebhookInfo(signal);
  if (webhook.url) throw new TelegramRuntimeError(conflictMessage);
  console.info(
    `Bot ${safeBotUsername(bot.botInfo.username)} iniciado con long polling. Las sesiones son temporales.`,
  );
  let offset: number | undefined;
  while (!signal.aborted) {
    let updates;
    try {
      updates = await bot.api.getUpdates(
        { offset, timeout: 30, allowed_updates: ['message'] },
        signal,
      );
    } catch (error) {
      if (signal.aborted) return;
      throw error;
    }
    for (const update of updates) {
      if (signal.aborted) return;
      await bot.handleUpdate(update);
      offset = update.update_id + 1;
    }
  }
}

export async function checkTelegram(
  api: Pick<Api, 'getMe' | 'getWebhookInfo' | 'deleteWebhook'>,
  deleteWebhook: boolean,
): Promise<void> {
  const me = await api.getMe();
  console.info(`Bot verificado: ${safeBotUsername(me.username)} · ID ${me.id}.`);
  let webhook = await api.getWebhookInfo();
  if (webhook.url && deleteWebhook) {
    await api.deleteWebhook({ drop_pending_updates: false });
    webhook = await api.getWebhookInfo();
    if (webhook.url)
      throw new TelegramRuntimeError('El webhook sigue activo; no inicies polling todavía.');
    console.info('Webhook eliminado. No se descartaron las actualizaciones pendientes.');
  }
  // La URL y last_error_message pueden contener secretos o contenido: no se imprimen.
  console.info('Webhook:', {
    activo: Boolean(webhook.url),
    pendientes: webhook.pending_update_count,
    certificadoPropio: webhook.has_custom_certificate,
    ultimoErrorEn: webhook.last_error_date,
    conexionesMaximas: webhook.max_connections,
  });
  if (webhook.url)
    console.info(
      'Para quitar el webhook explícitamente: npm run telegram:check -- --delete-webhook',
    );
}
