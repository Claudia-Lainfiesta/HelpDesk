import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TelegramNotificationsService,
  formatSupportMessage,
  notifyAfterCommit,
  type SupportEvent,
} from '../../src/integrations/telegram/support-group.js';
import { parseTelegramEnv } from '../../src/config/telegram-env.js';
const token = `${123456789}:${'x'.repeat(35)}`;
const config = { token, supportChatId: '-1001234567890' };
const cases: [SupportEvent, string][] = [
  [
    { type: 'created', number: 'TK-000020', category: 'Impresoras', priority: 'media' },
    'Nuevo ticket TK-000020 · Impresoras · Media',
  ],
  [
    { type: 'assigned', number: 'TK-000020', agent: 'Juan Pérez' },
    'Ticket TK-000020 asignado a Juan Pérez',
  ],
  [
    { type: 'reassigned', number: 'TK-000020', fromAgent: 'Juan Pérez', agent: 'María López' },
    'Ticket TK-000020 reasignado de Juan Pérez a María López',
  ],
  [{ type: 'urgent', number: 'TK-000020' }, 'Ticket TK-000020 marcado como Urgente'],
];
afterEach(() => vi.useRealTimers());
describe('avisos operativos de Telegram', () => {
  it.each(cases)('centraliza el texto exacto de %j', async (event, expected) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await new TelegramNotificationsService(config, fetcher).notify(event);
    expect(formatSupportMessage(event)).toBe(expected);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe(`https://api.telegram.org/bot${token}/sendMessage`);
    expect(JSON.parse(options!.body as string)).toEqual({
      chat_id: config.supportChatId,
      text: expected,
      link_preview_options: { is_disabled: true },
    });
    expect(options!.signal).toBeInstanceOf(AbortSignal);
  });
  it('solo serializa los campos permitidos, aunque el objeto tenga información adicional', () => {
    const event = {
      ...cases[0]![0],
      subject: 'ASUNTO_PRIVADO',
      description: 'DESCRIPCION_PRIVADA',
      requester: 'NOMBRE_PRIVADO',
      email: 'correo@example.invalid',
      note: 'NOTA_PRIVADA',
      fileName: 'PRIVADO.jpg',
      telegramUsername: '@PRIVADO',
    };
    const message = formatSupportMessage(event);
    for (const value of [
      'ASUNTO_PRIVADO',
      'DESCRIPCION_PRIVADA',
      'NOMBRE_PRIVADO',
      'correo@example.invalid',
      'NOTA_PRIVADA',
      'PRIVADO.jpg',
      '@PRIVADO',
    ])
      expect(message).not.toContain(value);
  });
  it.each([{}, { token }, { supportChatId: config.supportChatId }])(
    'queda deshabilitado con configuración incompleta, caso %#',
    async (partial) => {
      const log = vi.spyOn(console, 'info').mockImplementation(() => {}),
        fetcher = vi.fn<typeof fetch>();
      const service = new TelegramNotificationsService(partial, fetcher);
      await service.notify(cases[0]![0]);
      await service.notify(cases[1]![0]);
      expect(fetcher).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);
    },
  );
  it.each([403, 429, 500, 200])('sanea fallos HTTP/API %s sin propagar error', async (status) => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: false, description: token }), { status }),
      );
    await expect(
      new TelegramNotificationsService(config, fetcher).notify(cases[0]![0]),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('telegram.support.failed', {
      event: 'created',
      ticketNumber: 'TK-000020',
      status,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
  });
  it('red caída y timeout no filtran ni URL ni error recibido y el intento tiene límite de 4 segundos', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error(`https://api.telegram.org/bot${token}/sendMessage`));
    await expect(
      new TelegramNotificationsService(config, fetcher).notify(cases[0]![0]),
    ).resolves.toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(4000);
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('un envío detenido se aborta al vencer los cuatro segundos sin reintento', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener('abort', () => reject(new Error('timeout')), {
            once: true,
          });
        }),
    );
    const pending = new TelegramNotificationsService(config, fetcher).notify(cases[0]![0]);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(pending).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('telegram.support.failed', {
      event: 'created',
      ticketNumber: 'TK-000020',
      status: 'unavailable',
    });
  });
  it('una pasarela inyectada que falla tampoco revierte la respuesta de negocio', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      notifyAfterCommit(
        {
          notify: async () => {
            throw new Error(token);
          },
        },
        cases[0]![0],
      ),
    ).resolves.toBeUndefined();
  });
  it('valida exclusivamente un ID negativo de grupo para avisos generales', () => {
    expect(parseTelegramEnv({ TELEGRAM_SUPPORT_CHAT_ID: '-1001234567890' }).supportChatId).toBe(
      '-1001234567890',
    );
    for (const value of ['0', '123', '@grupo', '-1.5', '-9007199254740992'])
      expect(() => parseTelegramEnv({ TELEGRAM_SUPPORT_CHAT_ID: value })).toThrow(
        'ID numérico negativo',
      );
  });
});
