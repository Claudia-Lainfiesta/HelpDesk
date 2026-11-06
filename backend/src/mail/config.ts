import { z } from 'zod';

const boolean = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');
const integer = (fallback: string, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max));
const schema = z
  .object({
    SMTP_HOST: z
      .string()
      .trim()
      .min(1)
      .max(253)
      .regex(/^[a-z\d.:_-]+$/i)
      .default('127.0.0.1'),
    SMTP_PORT: integer('1025', 65535),
    SMTP_SECURE: boolean,
    SMTP_REQUIRE_TLS: boolean,
    SMTP_USER: z.string().trim().default(''),
    SMTP_PASSWORD: z.string().default(''),
    MAIL_FROM: z.string().trim().email(),
    RECOVERY_ADMIN_EMAIL: z.string().trim().email(),
    RECOVERY_RATE_LIMIT_PER_IP: integer('10', 10000),
    RECOVERY_RATE_LIMIT_PER_EMAIL: integer('3', 1000),
  })
  .superRefine((config, ctx) => {
    if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD))
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP_USER y SMTP_PASSWORD deben definirse juntos.',
      });
    if (config.SMTP_HOST.toLowerCase() === 'smtp-relay.brevo.com') {
      if (!config.SMTP_USER || !config.SMTP_PASSWORD)
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_USER'],
          message: 'Brevo requiere autenticación.',
        });
      if (
        (!config.SMTP_SECURE && !config.SMTP_REQUIRE_TLS) ||
        (config.SMTP_PORT === 587 && config.SMTP_SECURE)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_REQUIRE_TLS'],
          message: 'Brevo requiere TLS; 587 utiliza STARTTLS.',
        });
    }
  });
export function parseMailConfig(source: NodeJS.ProcessEnv) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Configuración de correo inválida: ${fields.join(', ')}. Revisa .env.example.`);
  }
  const data = result.data;
  return {
    host: data.SMTP_HOST,
    port: data.SMTP_PORT,
    secure: data.SMTP_SECURE,
    requireTLS: data.SMTP_REQUIRE_TLS,
    user: data.SMTP_USER,
    password: data.SMTP_PASSWORD,
    from: data.MAIL_FROM,
    recoveryAdminEmail: data.RECOVERY_ADMIN_EMAIL,
    recoveryRateLimitPerIp: data.RECOVERY_RATE_LIMIT_PER_IP,
    recoveryRateLimitPerEmail: data.RECOVERY_RATE_LIMIT_PER_EMAIL,
  };
}
export type MailConfig = ReturnType<typeof parseMailConfig>;
