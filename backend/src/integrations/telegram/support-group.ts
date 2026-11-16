import type { TicketPriority } from '../../tickets/validation.js';
export type SupportEvent =
  | { type: 'created'; number: string; category: string; priority: TicketPriority }
  | { type: 'assigned'; number: string; agent: string }
  | { type: 'reassigned'; number: string; fromAgent: string; agent: string }
  | { type: 'urgent'; number: string };
export interface SupportNotifier {
  notify(event: SupportEvent): Promise<void>;
}
const priorities: Record<TicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};
// Evita líneas adicionales y menciones masivas; se envía texto plano, sin parse_mode.
const label = (s: string) => s.replace(/[\r\n\u2028\u2029]/g, ' ').replace(/@/g, '＠');
export function formatSupportMessage(event: SupportEvent): string {
  switch (event.type) {
    case 'created':
      return `Nuevo ticket ${event.number} · ${label(event.category)} · ${priorities[event.priority]}`;
    case 'assigned':
      return `Ticket ${event.number} asignado a ${label(event.agent)}`;
    case 'reassigned':
      return `Ticket ${event.number} reasignado de ${label(event.fromAgent)} a ${label(event.agent)}`;
    case 'urgent':
      return `Ticket ${event.number} marcado como Urgente`;
  }
}
export class TelegramNotificationsService implements SupportNotifier {
  constructor(
    private readonly config: {
      token?: string | undefined;
      supportChatId?: string | undefined;
    } = {},
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!config.token || !config.supportChatId)
      console.info('Notificaciones de Telegram deshabilitadas.');
  }
  async notify(event: SupportEvent): Promise<void> {
    await this.sendSupportGroupMessage(formatSupportMessage(event), event);
  }
  async sendSupportGroupMessage(
    message: string,
    event: Pick<SupportEvent, 'type' | 'number'>,
  ): Promise<void> {
    if (!this.config.token || !this.config.supportChatId) return;
    let status: number | undefined;
    try {
      const response = await this.fetcher(
        `https://api.telegram.org/bot${this.config.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.supportChatId,
            text: message,
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(4000),
        },
      );
      status = response.status;
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('ok' in body) || body.ok !== true)
        throw new Error();
    } catch {
      console.warn('telegram.support.failed', {
        event: event.type,
        ticketNumber: event.number,
        status: status ?? 'unavailable',
      });
    }
  }
}
export async function notifyAfterCommit(
  notifier: SupportNotifier | undefined,
  event: SupportEvent,
): Promise<void> {
  if (!notifier) return;
  try {
    await notifier.notify(event);
  } catch {
    // Tampoco una pasarela inyectada puede convertir un commit en un error HTTP.
    console.warn('telegram.support.failed', {
      event: event.type,
      ticketNumber: event.number,
      status: 'unavailable',
    });
  }
}
