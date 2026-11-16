export const prioridadesTicket = ['baja', 'media', 'alta', 'urgente'] as const;
export type TicketPriority = (typeof prioridadesTicket)[number];
export const etiquetasPrioridad: Record<TicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};
export function esPrioridad(value: unknown): value is TicketPriority {
  return typeof value === 'string' && prioridadesTicket.some((priority) => priority === value);
}
export const opcionesPrioridad = prioridadesTicket.map((valor) => ({
  valor,
  etiqueta: etiquetasPrioridad[valor],
}));
