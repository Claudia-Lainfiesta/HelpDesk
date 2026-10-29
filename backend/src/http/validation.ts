import { z } from 'zod';
import { ApiError } from '../auth/errors.js';

export const idSchema = z
  .string()
  .refine((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n);
export function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Revisa los campos enviados.');
  return parsed.data;
}

export const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
