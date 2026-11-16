import { z } from 'zod';
import { idSchema } from '../http/validation.js';
export const ticketStatuses = [
  'creado',
  'en_proceso',
  'en_espera',
  'resuelto',
  'cerrado',
  'cancelado',
] as const;
export const statusSchema = z.enum(ticketStatuses);
export const ticketPriorities = ['baja', 'media', 'alta', 'urgente'] as const;
export type TicketPriority = (typeof ticketPriorities)[number];
export const prioritySchema = z.enum(ticketPriorities);
export const changePrioritySchema = z.object({ priority: prioritySchema }).strict();
export const createNoteSchema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();
export const createTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(5000),
    categoryId: idSchema,
  })
  .strict();
export const ticketFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce
      .number()
      .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
      .default(20),
    search: z.string().trim().max(160).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    categoryId: idSchema.optional(),
  })
  .strict();
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketFilters = z.infer<typeof ticketFiltersSchema>;

export const assignmentSchema = z.object({ agentId: idSchema.nullable() }).strict();
export const transitionActions = [
  'start',
  'wait',
  'resume',
  'resolve',
  'reopen',
  'close',
  'cancel',
] as const;
export type TransitionAction = (typeof transitionActions)[number];
export type TicketStatus = (typeof ticketStatuses)[number];
export const transitionSchema = z.object({ action: z.enum(transitionActions) }).strict();
export const eventFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
