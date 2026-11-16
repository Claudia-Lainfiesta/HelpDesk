import { z } from 'zod';

export const roleSchema = z.enum(['solicitante', 'agente', 'supervisor', 'administrador']);
const fullName = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(2000).nullable();
const expiresAt = z.iso.datetime({ offset: true }).nullable();
const telegramUsername = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, '').toLowerCase())
  .pipe(
    z
      .string()
      .regex(
        /^[a-z][a-z0-9_]{4,31}$/,
        'Escribe un usuario público de Telegram de 5 a 32 caracteres, sin enlaces.',
      ),
  )
  .nullable();

export const createUserSchema = z
  .object({
    fullName,
    email: z.string().trim().max(254).email().toLowerCase(),
    roleCode: roleSchema,
    temporary: z.boolean().default(false),
    expiresAt: expiresAt.optional(),
    notes: notes.optional(),
    telegramUsername: telegramUsername.optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    fullName: fullName.optional(),
    roleCode: roleSchema.optional(),
    expiresAt: expiresAt.optional(),
    notes: notes.optional(),
    telegramUsername: telegramUsername.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
