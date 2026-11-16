import { Usuario } from '../auth/modelos';
import { Ticket } from './tickets-api';
export type AccionTicket = 'start' | 'wait' | 'resume' | 'resolve' | 'reopen' | 'close' | 'cancel';
export const accionesTicket: Record<
  AccionTicket,
  { etiqueta: string; exito: string; confirmar: boolean }
> = {
  start: { etiqueta: 'Iniciar atención', exito: 'Atención iniciada.', confirmar: false },
  wait: { etiqueta: 'Poner en espera', exito: 'Ticket puesto en espera.', confirmar: false },
  resume: { etiqueta: 'Reanudar atención', exito: 'Atención reanudada.', confirmar: false },
  resolve: {
    etiqueta: 'Marcar como resuelto',
    exito: 'Ticket marcado como resuelto.',
    confirmar: true,
  },
  reopen: { etiqueta: 'El problema continúa', exito: 'Ticket reabierto.', confirmar: true },
  close: { etiqueta: 'Cerrar ticket', exito: 'Ticket cerrado.', confirmar: true },
  cancel: { etiqueta: 'Cancelar ticket', exito: 'Ticket cancelado.', confirmar: true },
};
export function permisosTicket(t: Ticket, u: Usuario | null) {
  if (!u)
    return {
      asignacion: 'ninguna' as const,
      acciones: [] as AccionTicket[],
      prioridadEditable: false,
      notasVisibles: false,
      seguimientoEditable: false,
      telegramVisible: false,
    };
  const gestiona = u.role === 'supervisor' || u.role === 'administrador';
  const propietario = t.requester.id === u.id;
  const asignado = u.role === 'agente' && t.assignedAgent?.id === u.id;
  const activo = ['creado', 'en_proceso', 'en_espera'].includes(t.status);
  const acciones: AccionTicket[] = [];
  if (t.assignedAgent && (gestiona || asignado)) {
    if (t.status === 'creado') acciones.push('start');
    if (t.status === 'en_proceso') acciones.push('wait', 'resolve');
    if (t.status === 'en_espera') acciones.push('resume', 'resolve');
  }
  if (gestiona || propietario) {
    if (['creado', 'en_espera'].includes(t.status)) acciones.push('cancel');
    if (t.status === 'resuelto') acciones.push('reopen', 'close');
  }
  const asignacion = activo
    ? gestiona
      ? 'gestionar'
      : u.role === 'agente' && !t.assignedAgent
        ? 'propia'
        : 'ninguna'
    : 'ninguna';
  return {
    asignacion,
    acciones,
    prioridadEditable: !['cerrado', 'cancelado'].includes(t.status) && (gestiona || asignado),
    notasVisibles: gestiona || asignado,
    seguimientoEditable: !['cerrado', 'cancelado'].includes(t.status) && (gestiona || asignado),
    telegramVisible:
      propietario &&
      !!t.assignedAgent &&
      !['cerrado', 'cancelado'].includes(t.status) &&
      t.assignedAgent.id !== u.id,
  };
}
