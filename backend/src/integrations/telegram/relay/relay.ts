import { SessionManager } from './session-manager.js';

export interface TelegramGateway {
  sendMessage(chatId: number, text: string): Promise<void>;
  copyMessage(toChatId: number, fromChatId: number, messageId: number): Promise<void>;
}

export interface LogMetadata {
  event: 'update' | 'label' | 'copy' | 'reply' | 'handler';
  result: 'received' | 'ignored' | 'ok' | 'failed';
  chatId?: number;
  userId?: number;
  toChatId?: number;
  updateId?: number;
  messageId?: number;
  updateType?: 'message' | 'other';
  errorCode?: number;
}
export type MetadataLogger = (metadata: LogMetadata) => void;
export const logMetadata: MetadataLogger = (metadata) => console.info('telegram', metadata);

export function telegramErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('error_code' in error && typeof error.error_code === 'number') return error.error_code;
  return undefined;
}

export function isUserAllowed(userId: number | undefined, allowed: readonly number[]): boolean {
  return userId !== undefined && (allowed.length === 0 || allowed.includes(userId));
}

export class TelegramRelay {
  constructor(
    readonly sessions: SessionManager,
    private readonly gateway: TelegramGateway,
    private readonly log: MetadataLogger = logMetadata,
  ) {}

  async reply(chatId: number, text: string): Promise<void> {
    try {
      await this.gateway.sendMessage(chatId, text);
      this.log({ event: 'reply', chatId, result: 'ok' });
    } catch (error) {
      this.log({ event: 'reply', chatId, result: 'failed', errorCode: telegramErrorCode(error) });
    }
  }

  async forward(chatId: number, messageId: number): Promise<void> {
    const route = this.sessions.route(chatId);
    if (!route.ok) {
      await this.reply(chatId, route.message);
      return;
    }
    let phase: 'label' | 'copy' = 'label';
    try {
      if (route.needsLabel) {
        const roleName = route.role === 'solicitante' ? 'Solicitante' : 'Agente';
        await this.gateway.sendMessage(route.toChatId, `${roleName} · ${route.reference}`);
        this.sessions.markLabelSent(chatId);
        this.log({ event: 'label', chatId, toChatId: route.toChatId, result: 'ok' });
      }
      phase = 'copy';
      await this.gateway.copyMessage(route.toChatId, chatId, messageId);
      this.log({ event: 'copy', chatId, toChatId: route.toChatId, messageId, result: 'ok' });
    } catch (error) {
      this.log({
        event: phase,
        chatId,
        toChatId: route.toChatId,
        messageId,
        result: 'failed',
        errorCode: telegramErrorCode(error),
      });
      await this.reply(
        chatId,
        'No se pudo confirmar la entrega. El otro usuario puede haber bloqueado el bot o no haber pulsado /start, el mensaje puede no ser copiable o Telegram puede estar caído o limitado. No se reintentará ni se pondrá en cola. El ticket no cambia.',
      );
    }
  }
}
