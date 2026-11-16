import { Reports, ReportOptions } from '../core/reportes/modelos';
export const opcionesReportesPrueba: ReportOptions = {
  categories: [
    { id: '8', name: 'Hardware', isActive: true },
    { id: '9', name: 'Categoría anterior', isActive: false },
  ],
  agents: [
    { id: '7', fullName: 'Juan Pérez', isActive: true },
    { id: '10', fullName: 'Agente anterior', isActive: false },
  ],
};
export const reportesPrueba: Reports = {
  summary: {
    range: {
      from: '2026-10-17T06:00:00.000Z',
      to: '2026-11-16T05:59:59.999Z',
      timeZone: 'America/Guatemala',
    },
    filters: { categoryId: null, agentId: null },
    kpis: {
      created: 12,
      resolved: 7,
      closed: 5,
      canceled: 1,
      pendingNow: 8,
      averageResolutionMinutes: 155,
      averageCloseMinutes: 1500,
    },
  },
  statuses: {
    items: [
      { status: 'creado', count: 2 },
      { status: 'en_proceso', count: 2 },
      { status: 'en_espera', count: 1 },
      { status: 'resuelto', count: 1 },
      { status: 'cerrado', count: 5 },
      { status: 'cancelado', count: 1 },
    ],
  },
  priorities: {
    items: [
      { priority: 'baja', count: 1 },
      { priority: 'media', count: 8 },
      { priority: 'alta', count: 2 },
      { priority: 'urgente', count: 1 },
    ],
  },
  categories: {
    items: [
      { category: opcionesReportesPrueba.categories[0]!, count: 10 },
      { category: opcionesReportesPrueba.categories[1]!, count: 2 },
    ],
  },
  trend: {
    granularity: 'day',
    timeZone: 'America/Guatemala',
    items: [
      { bucket: '2026-11-01', created: 3, resolved: 2, closed: 1, canceled: 0 },
      { bucket: '2026-11-02', created: 0, resolved: 0, closed: 0, canceled: 0 },
    ],
  },
  agents: {
    items: [
      {
        agent: opcionesReportesPrueba.agents[0]!,
        assignedNow: 5,
        resolvedInRange: 4,
        closedInRange: 2,
        averageResolutionMinutes: 155,
      },
      {
        agent: opcionesReportesPrueba.agents[1]!,
        assignedNow: 3,
        resolvedInRange: 3,
        closedInRange: 3,
        averageResolutionMinutes: null,
      },
    ],
  },
};
