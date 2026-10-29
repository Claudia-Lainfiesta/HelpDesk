import { describe, expect, it, vi } from 'vitest';
import { isUserAllowed, TelegramRelay } from '../../src/integrations/telegram/relay/relay.js';
import { SessionManager } from '../../src/integrations/telegram/relay/session-manager.js';

function setup() {
  const sessions = new SessionManager();
  sessions.join(1, 'TK-000001', 'solicitante');
  sessions.join(2, 'TK-000001', 'agente');
  const gateway = {
    sendMessage: vi.fn<(chatId: number, text: string) => Promise<void>>().mockResolvedValue(),
    copyMessage: vi
      .fn<(to: number, from: number, id: number) => Promise<void>>()
      .mockResolvedValue(),
  };
  const log = vi.fn();
  return { sessions, gateway, log, relay: new TelegramRelay(sessions, gateway, log) };
}

describe('relevo con pasarela falsa', () => {
  it('copia por IDs y etiqueta solo al cambiar quien habla', async () => {
    const { relay, gateway } = setup();
    await relay.forward(1, 10);
    await relay.forward(1, 11);
    await relay.forward(2, 12);
    await relay.forward(2, 13);
    await relay.forward(1, 14);
    expect(gateway.sendMessage.mock.calls).toEqual([
      [2, 'Solicitante · TK-000001'],
      [1, 'Agente · TK-000001'],
      [2, 'Solicitante · TK-000001'],
    ]);
    expect(gateway.copyMessage.mock.calls).toEqual([
      [2, 1, 10],
      [2, 1, 11],
      [1, 2, 12],
      [1, 2, 13],
      [2, 1, 14],
    ]);
    expect(gateway.sendMessage.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.copyMessage.mock.invocationCallOrder[0]!,
    );
  });
  it('avisa sin encolar y no copia si falta el otro lado', async () => {
    const { relay, gateway, sessions } = setup();
    sessions.leave(2);
    await relay.forward(1, 10);
    expect(gateway.sendMessage).toHaveBeenCalledWith(
      1,
      expect.stringContaining('aún no se ha unido'),
    );
    expect(gateway.copyMessage).not.toHaveBeenCalled();
    sessions.join(2, 'TK-000001', 'agente');
    expect(gateway.copyMessage).not.toHaveBeenCalled();
    await relay.forward(1, 11);
    expect(gateway.copyMessage).toHaveBeenCalledExactlyOnceWith(2, 1, 11);
  });
  it.each([403, 400, 429, undefined])(
    'captura el fallo %s y avisa sin reintentar',
    async (errorCode) => {
      const { relay, gateway, log } = setup();
      gateway.copyMessage.mockRejectedValueOnce({
        error_code: errorCode,
        payload: 'CONTENIDO_PRIVADO',
        description: 'DATOS_PRIVADOS',
      });
      await expect(relay.forward(1, 10)).resolves.toBeUndefined();
      expect(gateway.copyMessage).toHaveBeenCalledTimes(1);
      expect(gateway.sendMessage).toHaveBeenLastCalledWith(
        1,
        expect.stringContaining('No se pudo confirmar la entrega'),
      );
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/CONTENIDO_PRIVADO|DATOS_PRIVADOS/);
      await relay.forward(2, 11);
      expect(gateway.copyMessage).toHaveBeenLastCalledWith(1, 2, 11);
    },
  );
  it('si falla la etiqueta no copia y comunica el error al emisor', async () => {
    const { relay, gateway } = setup();
    gateway.sendMessage.mockRejectedValueOnce(new Error('DETALLE_PRIVADO'));
    await expect(relay.forward(1, 10)).resolves.toBeUndefined();
    expect(gateway.copyMessage).not.toHaveBeenCalled();
    expect(gateway.sendMessage).toHaveBeenLastCalledWith(
      1,
      expect.stringContaining('No se pudo confirmar'),
    );
  });
  it('no repite una etiqueta ya enviada aunque falle la copia', async () => {
    const { relay, gateway } = setup();
    gateway.copyMessage.mockRejectedValueOnce(new Error('red'));
    await relay.forward(1, 10);
    await relay.forward(1, 11);
    expect(
      gateway.sendMessage.mock.calls.filter(([, text]) => text.startsWith('Solicitante')),
    ).toHaveLength(1);
    expect(gateway.copyMessage).toHaveBeenLastCalledWith(2, 1, 11);
  });
  it('tampoco lanza si falla el aviso al emisor', async () => {
    const { relay, gateway, log } = setup();
    gateway.sendMessage.mockRejectedValue(new Error('DETALLE_PRIVADO'));
    await expect(relay.forward(1, 10)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'reply', result: 'failed' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('DETALLE_PRIVADO');
  });
  it('filtra IDs permitidos y permite todos si la lista está vacía', () => {
    expect(isUserAllowed(1, [1, 2])).toBe(true);
    expect(isUserAllowed(3, [1, 2])).toBe(false);
    expect(isUserAllowed(3, [])).toBe(true);
    expect(isUserAllowed(undefined, [])).toBe(false);
  });
});
