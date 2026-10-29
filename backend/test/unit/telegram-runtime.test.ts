import { AbortController } from 'abort-controller';
import { expect, it, vi } from 'vitest';
import { createTelegramBot } from '../../src/integrations/telegram/bot.js';
import {
  checkTelegram,
  describeTelegramFailure,
  runLongPolling,
} from '../../src/integrations/telegram/runtime.js';
import { botInfo as me } from './telegram-fixtures.js';

it('explica las dos causas posibles de 409 sin mostrar el error original', () => {
  const message = describeTelegramFailure({ error_code: 409, description: 'DETALLE_PRIVADO' });
  expect(message).toContain('otro proceso');
  expect(message).toContain('webhook');
  expect(message).not.toContain('DETALLE_PRIVADO');
  expect(describeTelegramFailure(new Error('DETALLE_PRIVADO'))).not.toContain('DETALLE_PRIVADO');
});

it('telegram:check omite la URL y los detalles del webhook y solo lo elimina con el flag', async () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const active = {
    url: 'https://example.invalid/SECRETO_PRIVADO',
    pending_update_count: 2,
    has_custom_certificate: false,
    last_error_message: 'CONTENIDO_PRIVADO',
  };
  const api = {
    getMe: vi.fn().mockResolvedValue(me),
    getWebhookInfo: vi.fn().mockResolvedValue(active),
    deleteWebhook: vi.fn().mockResolvedValue(true),
  };
  await checkTelegram(api, false);
  expect(api.deleteWebhook).not.toHaveBeenCalled();
  api.getWebhookInfo.mockResolvedValueOnce(active).mockResolvedValueOnce({ ...active, url: '' });
  await checkTelegram(api, true);
  expect(api.deleteWebhook).toHaveBeenCalledExactlyOnceWith({ drop_pending_updates: false });
  const logs = JSON.stringify(log.mock.calls);
  expect(logs).not.toMatch(/SECRETO_PRIVADO|CONTENIDO_PRIVADO/);
  expect(logs).toContain('@helpdesk_poc_bot');
});

it('no elimina webhooks al iniciar polling ni reintenta una llamada fallida', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const token = [String(1).repeat(9), 'x'.repeat(35)].join(':');
  const bot = createTelegramBot({ token, allowedUserIds: [], log: vi.fn() });
  const getMe = vi.spyOn(bot.api, 'getMe').mockResolvedValue(me);
  const webhook = vi.spyOn(bot.api, 'getWebhookInfo').mockResolvedValue({
    url: 'https://example.invalid',
    has_custom_certificate: false,
    pending_update_count: 0,
  });
  const remove = vi.spyOn(bot.api, 'deleteWebhook').mockResolvedValue(true);
  const updates = vi.spyOn(bot.api, 'getUpdates').mockRejectedValue({ error_code: 409 });
  const controller = new AbortController();
  await expect(runLongPolling(bot, controller.signal)).rejects.toThrow('Conflicto 409');
  expect(remove).not.toHaveBeenCalled();
  expect(updates).not.toHaveBeenCalled();
  webhook.mockResolvedValue({ url: '', has_custom_certificate: false, pending_update_count: 0 });
  await expect(runLongPolling(bot, controller.signal)).rejects.toEqual({ error_code: 409 });
  expect(updates).toHaveBeenCalledTimes(1);
  getMe.mockRejectedValue(new Error('red'));
  await expect(runLongPolling(bot, controller.signal)).rejects.toThrow('red');
  expect(getMe).toHaveBeenCalledTimes(3);
});

it('detiene el polling ordenadamente al abortar la espera de getUpdates', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const token = [String(1).repeat(9), 'x'.repeat(35)].join(':');
  const bot = createTelegramBot({ token, allowedUserIds: [], log: vi.fn() });
  vi.spyOn(bot.api, 'getMe').mockResolvedValue(me);
  vi.spyOn(bot.api, 'getWebhookInfo').mockResolvedValue({
    url: '',
    has_custom_certificate: false,
    pending_update_count: 0,
  });
  const controller = new AbortController();
  vi.spyOn(bot.api, 'getUpdates').mockImplementation(async () => {
    controller.abort();
    throw new Error('cancelado');
  });
  await expect(runLongPolling(bot, controller.signal)).resolves.toBeUndefined();
});
