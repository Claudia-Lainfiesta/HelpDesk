import { z } from 'zod';

export const roleSchema = z.enum(['solicitante', 'agente', 'supervisor', 'administrador']);
const fullName = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(2000).nullable();
const expiresAt = z.iso.datetime({ offset: true }).nullable();

export const createUserSchema = z
  .object({
    fullName,
    email: z.string().trim().max(254).email().toLowerCase(),
    roleCode: roleSchema,
    temporary: z.boolean().default(false),
    expiresAt: expiresAt.optional(),
    notes: notes.optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    fullName: fullName.optional(),
    roleCode: roleSchema.optional(),
    expiresAt: expiresAt.optional(),
    notes: notes.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
