import { z } from 'zod';

const days = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : value),
    z.coerce.number().int().min(1).max(365),
  );
const schema = z
  .object({
    TEMP_ACCOUNT_DEFAULT_DAYS: days(7),
    TEMP_ACCOUNT_MAX_DAYS: days(30),
  })
  .refine((value) => value.TEMP_ACCOUNT_DEFAULT_DAYS <= value.TEMP_ACCOUNT_MAX_DAYS);

export function parseUserConfig(source: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(source);
  if (!parsed.success)
    throw new Error(
      'TEMP_ACCOUNT_DEFAULT_DAYS y TEMP_ACCOUNT_MAX_DAYS deben ser enteros positivos (hasta 365), con el valor por defecto menor o igual al máximo.',
    );
  return {
    tempAccountDefaultDays: parsed.data.TEMP_ACCOUNT_DEFAULT_DAYS,
    tempAccountMaxDays: parsed.data.TEMP_ACCOUNT_MAX_DAYS,
  };
}

export type UserConfig = ReturnType<typeof parseUserConfig>;
