import { describe, it, expect } from 'vitest';
import {
  checkTransition,
  checkAssignment,
  checkNoteCreation,
  canReadNotes,
  type CurrentTicket,
} from '../../src/tickets/policy.js';
import { ticketStatuses, transitionActions } from '../../src/tickets/validation.js';
import type { UserProfile } from '../../src/auth/types.js';
const user: UserProfile = {
  id: '1',
  fullName: 'Empleado',
  email: 'empleado@example.invalid',
  role: 'administrador',
  mustChangePassword: false,
  expiresAt: null,
};
const allowed = [
  'creado:start',
  'creado:cancel',
  'en_proceso:wait',
  'en_proceso:resolve',
  'en_espera:resume',
  'en_espera:resolve',
  'en_espera:cancel',
  'resuelto:reopen',
  'resuelto:close',
];
describe('máquina exacta de estados', () => {
  for (const status of ticketStatuses)
    for (const action of transitionActions)
      it(`${status} / ${action}`, () => {
        const t: CurrentTicket = { id: '10', status, requesterId: '2', agentId: '3' };
        if (allowed.includes(`${status}:${action}`))
          expect(ticketStatuses).toContain(checkTransition(t, user, action));
        else
          expect(() => checkTransition(t, user, action)).toThrow(
            expect.objectContaining({ code: 'INVALID_TICKET_TRANSITION' }),
          );
      });
  it('un propietario agente no hereda los permisos de otro agente asignado', () => {
    const owner = { ...user, role: 'agente' as const };
    const t: CurrentTicket = { id: '10', status: 'resuelto', requesterId: '1', agentId: '3' };
    expect(checkTransition(t, owner, 'close')).toBe('cerrado');
    expect(checkTransition(t, owner, 'reopen')).toBe('en_proceso');
    expect(() => checkTransition({ ...t, status: 'en_proceso' }, owner, 'resolve')).toThrow(
      expect.objectContaining({ code: 'TICKET_ACTION_FORBIDDEN' }),
    );
  });
  it('no permite pasar del rol solicitante a asignación por ser propietario', () => {
    expect(() =>
      checkAssignment(
        { id: '10', status: 'creado', requesterId: '1', agentId: null },
        { ...user, role: 'solicitante' },
        '1',
      ),
    ).toThrow();
  });
  for (const role of ['solicitante', 'agente', 'supervisor', 'administrador'] as const)
    for (const status of ticketStatuses)
      it(`notas ${role}/${status}: propiedad no amplía visibilidad`, () => {
        const actor = { ...user, role };
        const t: CurrentTicket = { id: '10', status, requesterId: '1', agentId: '3' };
        const allowed = role === 'supervisor' || role === 'administrador';
        expect(canReadNotes(t, actor)).toBe(allowed);
        if (allowed && !['cerrado', 'cancelado'].includes(status))
          expect(() => checkNoteCreation(t, actor)).not.toThrow();
        else
          expect(() => checkNoteCreation(t, actor)).toThrow(
            expect.objectContaining({
              code: allowed ? 'TICKET_NOTES_READ_ONLY' : 'TICKET_NOTE_FORBIDDEN',
            }),
          );
        expect(canReadNotes({ ...t, agentId: '1' }, { ...user, role: 'agente' })).toBe(true);
      });
});
