import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import { emailSchema } from '../validation.js';
import { input } from '../../http/validation.js';
import type { MailConfig } from '../../mail/config.js';
import type { RecoveryNotice } from '../../mail/mailer.js';
import { mailer } from '../../mail/default.js';
import { registerRecovery } from './service.js';
import { scheduleRecoveryNotice } from './dispatch.js';

import { recoveryResponse } from './response.js';
export { recoveryResponse } from './response.js';
export function recoveryEmailKey(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}
export interface RecoveryDependencies {
  register: typeof registerRecovery;
  send: (account: RecoveryNotice) => Promise<void>;
}
export function recoveryRouter(
  config: Pick<MailConfig, 'recoveryRateLimitPerIp' | 'recoveryRateLimitPerEmail'>,
  dependencies: RecoveryDependencies = {
    register: registerRecovery,
    send: (account) => mailer.sendRecoveryNotice(account),
  },
): Router {
  const router = Router();
  const rateLimited = (_req: unknown, _res: unknown, next: (error: ApiError) => void) =>
    next(
      new ApiError(
        429,
        'RECOVERY_RATE_LIMIT',
        'Has realizado demasiadas solicitudes. Intenta más tarde.',
      ),
    );
  const common = {
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
    handler: rateLimited,
  };
  const byIp = rateLimit({
    ...common,
    windowMs: 15 * 60000,
    limit: config.recoveryRateLimitPerIp,
    keyGenerator: (req) => {
      const ip = req.ip && isIP(req.ip) ? req.ip : req.socket.remoteAddress;
      return ip && isIP(ip) ? ipKeyGenerator(ip) : 'unknown-client';
    },
  });
  const byEmail = rateLimit({
    ...common,
    windowMs: 60 * 60000,
    limit: config.recoveryRateLimitPerEmail,
    keyGenerator: (req) => recoveryEmailKey((req.body as { email: string }).email),
  });
  router.post(
    '/recovery-request',
    (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    byIp,
    (req, _res, next) => {
      req.body = input(z.object({ email: emailSchema }).strict(), req.body);
      next();
    },
    byEmail,
    async (req, res) => {
      const account = await dependencies.register((req.body as { email: string }).email, req.ip);
      res.status(202).json(recoveryResponse);
      if (account) scheduleRecoveryNotice(account, dependencies.send);
    },
  );
  return router;
}
