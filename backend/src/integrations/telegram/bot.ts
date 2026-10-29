import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { SessionManager } from './relay/session-manager.js';
import { isUserAllowed, logMetadata, TelegramRelay } from './relay/relay.js';
import type { MetadataLogger, TelegramGateway } from './relay/relay.js';

const help = [
  'HelpDesk · prueba de conversación privada entre solicitante y agente.',
  '/miid: muestra tu ID para la lista permitida.',
  '/ticket TK-000001 solicitante: une tu chat como solicitante.',
  '/ticket TK-000001 agente: une tu chat como agente.',
  '/estado: consulta tu ticket, rol y si el otro lado está presente.',
  '/salir: abandona la conversación. /ayuda: muestra esta guía.',
  'Ambas personas deben abrir este mismo bot y pulsar /start.',
  'Los mensajes, fotos y archivos se copian al otro lado. No escribas notas internas aquí.',
  'No se crean tickets ni cambian sus estados o responsables. Las sesiones se pierden al reiniciar.',
].join('\n');

export interface BotOptions {
  token: string;
  allowedUserIds: readonly number[];
  botInfo?: UserFromGetMe;
  sessions?: SessionManager;
  log?: MetadataLogger;
}

export function createTelegramBot(options: BotOptions): Bot {
  const bot = new Bot(options.token, {
    botInfo: options.botInfo,
    client: { timeoutSeconds: 40, sensitiveLogs: false },
  });
  const log = options.log ?? logMetadata;
  const gateway: TelegramGateway = {
    async sendMessage(chatId, text) {
      await bot.api.sendMessage(chatId, text);
    },
    async copyMessage(toChatId, fromChatId, messageId) {
      await bot.api.copyMessage(toChatId, fromChatId, messageId);
    },
  };
  const sessions = options.sessions ?? new SessionManager();
  const relay = new TelegramRelay(sessions, gateway, log);

  bot.use(async (ctx, next) => {
    const metadata = {
      event: 'update' as const,
      updateId: ctx.update.update_id,
      updateType: ctx.message ? ('message' as const) : ('other' as const),
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
      messageId: ctx.message?.message_id,
    };
    if (!isUserAllowed(ctx.from?.id, options.allowedUserIds) || ctx.from?.is_bot) {
      log({ ...metadata, result: 'ignored' });
      return;
    }
    log({ ...metadata, result: 'received' });
    if (!ctx.chat) return;
    if (ctx.chat.type !== 'private') {
      await relay.reply(ctx.chat.id, 'Esta prueba solo funciona en chats privados con el bot.');
      return;
    }
    try {
      await next();
    } catch {
      log({
        event: 'handler',
        chatId: ctx.chat.id,
        updateId: ctx.update.update_id,
        result: 'failed',
      });
      await relay.reply(
        ctx.chat.id,
        'No se pudo procesar esta actualización. La conversación sigue disponible; el ticket no cambia.',
      );
    }
  });

  bot.command(['start', 'ayuda'], (ctx) => relay.reply(ctx.chat.id, help));
  bot.command('miid', (ctx) => relay.reply(ctx.chat.id, `Tu ID de Telegram es ${ctx.from?.id}.`));
  bot.command('ticket', (ctx) => {
    const args = ctx.match.trim().split(/\s+/);
    if (args.length !== 2 || !args[0] || !args[1]) {
      return relay.reply(
        ctx.chat.id,
        'Uso: /ticket TK-000001 solicitante o /ticket TK-000001 agente.',
      );
    }
    return relay.reply(ctx.chat.id, sessions.join(ctx.chat.id, args[0], args[1]).message);
  });
  bot.command('estado', (ctx) => {
    const status = sessions.status(ctx.chat.id);
    return relay.reply(
      ctx.chat.id,
      status
        ? `${status.reference} · ${status.role}. ${status.peerChatId === undefined ? 'El otro lado aún no se ha unido.' : 'El otro lado está presente.'}`
        : 'No estás unido a un ticket. Usa /ticket para participar.',
    );
  });
  bot.command('salir', (ctx) =>
    relay.reply(
      ctx.chat.id,
      sessions.leave(ctx.chat.id)
        ? 'Saliste de la conversación. Tu rol quedó libre; el ticket no cambia.'
        : 'No estabas unido a ninguna conversación.',
    ),
  );
  bot.on('message', (ctx) => {
    if ((ctx.message.text ?? ctx.message.caption)?.trimStart().startsWith('/')) {
      return relay.reply(
        ctx.chat.id,
        'Comando no reconocido. Usa /ayuda. Los comandos nunca se reenvían.',
      );
    }
    return relay.forward(ctx.chat.id, ctx.message.message_id);
  });
  // Sustituye el manejador predeterminado de grammY, que puede imprimir el error completo.
  bot.catch((error) => {
    log({ event: 'handler', updateId: error.ctx.update.update_id, result: 'failed' });
  });
  return bot;
}
