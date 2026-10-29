import { describe, expect, it } from 'vitest';
import {
  isTicketReference,
  SessionManager,
} from '../../src/integrations/telegram/relay/session-manager.js';

describe('sesiones Telegram en memoria', () => {
  it.each(['TK-000001', 'TK-999999', 'TK-1000000', 'TK-123456789012345'])(
    'acepta %s',
    (reference) => {
      expect(isTicketReference(reference)).toBe(true);
    },
  );
  it.each([
    '',
    'TK-1',
    'TK-00001',
    'tk-000001',
    'TK-ABCDEF',
    ' TK-000001',
    'TK-000001\n',
    'TK-000001 ',
    'TK-123456x',
  ])('rechaza una referencia inválida: %j', (reference) => {
    expect(isTicketReference(reference)).toBe(false);
  });
  it('valida referencia y rol antes de unir un chat', () => {
    const sessions = new SessionManager();
    expect(sessions.join(1, 'invalida', 'agente').ok).toBe(false);
    expect(sessions.join(1, 'TK-000001', 'supervisor').ok).toBe(false);
    expect(sessions.status(1)).toBeUndefined();
  });
  it('permite un solo ticket y rol por chat, con unión idempotente', () => {
    const sessions = new SessionManager();
    expect(sessions.join(1, 'TK-000001', 'solicitante').ok).toBe(true);
    expect(sessions.join(1, 'TK-000001', 'solicitante').ok).toBe(true);
    expect(sessions.join(1, 'TK-000002', 'solicitante')).toMatchObject({
      ok: false,
      message: expect.stringContaining('/salir'),
    });
    expect(sessions.join(1, 'TK-000001', 'agente').ok).toBe(false);
    expect(sessions.status(1)).toMatchObject({ reference: 'TK-000001', role: 'solicitante' });
  });
  it('rechaza un rol ocupado y encamina en ambos sentidos', () => {
    const sessions = new SessionManager();
    sessions.join(1, 'TK-000001', 'solicitante');
    expect(sessions.join(3, 'TK-000001', 'solicitante')).toMatchObject({
      ok: false,
      message: expect.stringContaining('ocupado'),
    });
    sessions.join(2, 'TK-000001', 'agente');
    expect(sessions.route(1)).toMatchObject({ ok: true, toChatId: 2, role: 'solicitante' });
    expect(sessions.route(2)).toMatchObject({ ok: true, toChatId: 1, role: 'agente' });
  });
  it('informa cuando falta el otro lado o no hay sesión', () => {
    const sessions = new SessionManager();
    expect(sessions.route(1).ok).toBe(false);
    sessions.join(1, 'TK-000001', 'solicitante');
    expect(sessions.route(1)).toMatchObject({
      ok: false,
      message: expect.stringContaining('aún no se ha unido'),
    });
  });
  it('salir libera el rol, cambia el estado del otro lado y restablece las etiquetas', () => {
    const sessions = new SessionManager();
    sessions.join(1, 'TK-000001', 'solicitante');
    sessions.join(2, 'TK-000001', 'agente');
    sessions.markLabelSent(1);
    expect(sessions.route(1)).toMatchObject({ needsLabel: false });
    expect(sessions.leave(2)).toBe(true);
    expect(sessions.status(2)).toBeUndefined();
    expect(sessions.status(1)?.peerChatId).toBeUndefined();
    expect(sessions.join(3, 'TK-000001', 'agente').ok).toBe(true);
    expect(sessions.route(1)).toMatchObject({ toChatId: 3, needsLabel: true });
    expect(sessions.leave(1)).toBe(true);
    expect(sessions.leave(3)).toBe(true);
    expect(sessions.leave(3)).toBe(false);
    expect(sessions.join(1, 'TK-000002', 'agente').ok).toBe(true);
  });
});
