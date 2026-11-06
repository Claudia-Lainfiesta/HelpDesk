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
    categoryId: idSchema.optional(),
  })
  .strict();
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketFilters = z.infer<typeof ticketFiltersSchema>;
