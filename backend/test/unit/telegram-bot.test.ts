import { expect, it, vi } from 'vitest';
import type { Update } from 'grammy/types';
import { createTelegramBot } from '../../src/integrations/telegram/bot.js';
import { SessionManager } from '../../src/integrations/telegram/relay/session-manager.js';
import { botInfo } from './telegram-fixtures.js';

function setup(allowedUserIds: number[] = []) {
  const sessions = new SessionManager();
  const log = vi.fn();
  // Credencial sintética para construir el adaptador; todos los métodos de red se sustituyen.
  const token = [String(1).repeat(9), 'x'.repeat(35)].join(':');
  const bot = createTelegramBot({ token, allowedUserIds, sessions, log, botInfo });
  const send = vi.spyOn(bot.api, 'sendMessage').mockResolvedValue({
    message_id: 1,
    date: 0,
    chat: { id: 1, type: 'private', first_name: 'Prueba' },
    text: 'ack',
  });
  const copy = vi.spyOn(bot.api, 'copyMessage').mockResolvedValue({ message_id: 10 });
  return { bot, sessions, send, copy, log, token };
}

function update(chatId: number, text: string, messageId = 1): Update {
  const command = text.startsWith('/') ? text.split(/\s/)[0] : undefined;
  return {
    update_id: messageId,
    message: {
      message_id: messageId,
      date: 0,
      chat: { id: chatId, type: 'private', first_name: 'Prueba' },
      from: { id: chatId, is_bot: false, first_name: 'Prueba' },
      text,
      entities: command ? [{ type: 'bot_command', offset: 0, length: command.length }] : undefined,
    },
  };
}

it('conecta /start, /ayuda, /miid, /ticket, /estado y /salir sin red', async () => {
  const { bot, sessions, send } = setup();
  await bot.handleUpdate(update(1, '/start'));
  expect(send).toHaveBeenLastCalledWith(1, expect.stringContaining('/ticket'));
  await bot.handleUpdate(update(1, '/ayuda'));
  expect(send).toHaveBeenLastCalledWith(1, expect.stringContaining('/salir'));
  await bot.handleUpdate(update(1, '/miid'));
  expect(send).toHaveBeenLastCalledWith(1, 'Tu ID de Telegram es 1.');
  await bot.handleUpdate(update(1, '/ticket TK-000001 solicitante'));
  await bot.handleUpdate(update(1, '/estado'));
  expect(send).toHaveBeenLastCalledWith(1, expect.stringContaining('aún no se ha unido'));
  await bot.handleUpdate(update(2, '/ticket TK-000001 agente'));
  await bot.handleUpdate(update(1, '/estado'));
  expect(send).toHaveBeenLastCalledWith(1, expect.stringContaining('está presente'));
  await bot.handleUpdate(update(2, '/salir'));
  expect(sessions.status(2)).toBeUndefined();
});

it('ignora por completo a una persona fuera de la lista permitida', async () => {
  const { bot, send, copy, sessions } = setup([1, 2]);
  await bot.handleUpdate(update(3, '/miid'));
  await bot.handleUpdate(update(3, '/ticket TK-000001 agente'));
  await bot.handleUpdate(update(3, 'CONTENIDO_PRIVADO'));
  expect(send).not.toHaveBeenCalled();
  expect(copy).not.toHaveBeenCalled();
  expect(sessions.status(3)).toBeUndefined();
});

it('copia texto y fotos solo por IDs; no registra contenido ni credenciales', async () => {
  const { bot, send, copy, log, token } = setup();
  await bot.handleUpdate(update(1, '/ticket TK-000001 solicitante'));
  await bot.handleUpdate(update(2, '/ticket TK-000001 agente'));
  send.mockClear();
  await bot.handleUpdate(update(1, 'CONTENIDO_PRIVADO', 100));
  const photo: Update = {
    update_id: 101,
    message: {
      message_id: 101,
      date: 0,
      chat: { id: 2, type: 'private', first_name: 'Prueba' },
      from: { id: 2, is_bot: false, first_name: 'Prueba' },
      caption: 'PIE_PRIVADO',
      photo: [
        { file_id: 'archivo_de_prueba', file_unique_id: 'id_de_prueba', width: 1, height: 1 },
      ],
    },
  };
  await bot.handleUpdate(photo);
  expect(copy.mock.calls).toEqual([
    [2, 1, 100],
    [1, 2, 101],
  ]);
  expect(send.mock.calls).toEqual([
    [2, 'Solicitante · TK-000001'],
    [1, 'Agente · TK-000001'],
  ]);
  const logs = JSON.stringify(log.mock.calls);
  expect(logs).not.toMatch(/CONTENIDO_PRIVADO|PIE_PRIVADO|archivo_de_prueba/);
  expect(logs.includes(token)).toBe(false);
});

it('no reenvía comandos desconocidos, incluidas notas internas escritas como comando', async () => {
  const { bot, copy, send } = setup();
  await bot.handleUpdate(update(1, '/ticket TK-000001 solicitante'));
  await bot.handleUpdate(update(2, '/ticket TK-000001 agente'));
  await bot.handleUpdate(update(1, '/nota CONTENIDO_PRIVADO'));
  expect(copy).not.toHaveBeenCalled();
  expect(send).toHaveBeenLastCalledWith(1, expect.stringContaining('comandos nunca se reenvían'));
});

it('no permite que un grupo ocupe un rol', async () => {
  const { bot, sessions } = setup();
  const group: Update = {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: { id: -1, type: 'group', title: 'Prueba' },
      from: { id: 1, is_bot: false, first_name: 'Prueba' },
      text: '/ticket TK-000001 agente',
      entities: [{ type: 'bot_command', offset: 0, length: 7 }],
    },
  };
  await bot.handleUpdate(group);
  expect(sessions.status(-1)).toBeUndefined();
});
