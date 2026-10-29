import { z } from 'zod';

const integer = (fallback: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : value),
    z.coerce.number().int().positive().max(maximum),
  );
const schema = z.object({
  SESSION_IDLE_MINUTES: integer(30, 1440),
  SESSION_ABSOLUTE_HOURS: integer(8, 168),
  LOGIN_MAX_ATTEMPTS: integer(5, 100),
  LOGIN_LOCK_MINUTES: integer(15, 1440),
  LOGIN_RATE_LIMIT_PER_IP: integer(30, 10000),
  TRUST_PROXY: z
    .string()
    .default('false')
    .refine((value) => value === 'false' || /^(?:[0-9]|10)$/.test(value)),
});

export function parseAuthConfig(source: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(
      `Configuración de autenticación inválida: ${fields.join(', ')}. Revisa .env.example.`,
    );
  }
  const data = parsed.data;
  return {
    sessionIdleMinutes: data.SESSION_IDLE_MINUTES,
    sessionAbsoluteHours: data.SESSION_ABSOLUTE_HOURS,
    loginMaxAttempts: data.LOGIN_MAX_ATTEMPTS,
    loginLockMinutes: data.LOGIN_LOCK_MINUTES,
    loginRateLimitPerIp: data.LOGIN_RATE_LIMIT_PER_IP,
    trustProxy: data.TRUST_PROXY === 'false' ? (false as const) : Number(data.TRUST_PROXY),
  };
}

export interface AuthConfig extends ReturnType<typeof parseAuthConfig> {
  frontendOrigin: string;
  nodeEnv: string;
}
