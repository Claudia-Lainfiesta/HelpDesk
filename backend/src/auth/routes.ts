import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { isIP } from 'node:net';
import { z } from 'zod';
import type { AuthConfig } from './config.js';
import { ApiError } from './errors.js';
import { requireAuth } from './middlewares.js';
import {
  clearSessionCookie,
  hashSessionToken,
  readSessionToken,
  sessionCookie,
} from './session.js';
import { changePassword, login } from './service.js';
import { pool } from '../db/pool.js';

export const emailSchema = z.string().trim().max(254).email().toLowerCase();
const passwordInput = z.string().min(1).max(256);
const loginSchema = z.object({ email: emailSchema, password: passwordInput }).strict();
const changeSchema = z
  .object({ currentPassword: passwordInput, newPassword: z.string().max(256) })
  .strict();

function input<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError(400, 'INVALID_INPUT', 'Revisa los campos enviados.');
  return result.data;
}

export function authRouter(config: AuthConfig): Router {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  const limiter = rateLimit({
    windowMs: 15 * 60000,
    limit: config.loginRateLimitPerIp,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = req.ip && isIP(req.ip) ? req.ip : req.socket.remoteAddress;
      return ip && isIP(ip) ? ipKeyGenerator(ip) : 'unknown-client';
    },
    handler: (_req, _res, next) =>
      next(new ApiError(429, 'LOGIN_RATE_LIMIT', 'Demasiados intentos. Intenta más tarde.')),
  });
  router.post('/login', limiter, async (req, res) => {
    const body = input(loginSchema, req.body);
    const result = await login(body.email, body.password, config, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      previousSessionId: req.auth?.sessionId,
    });
    const cookie = sessionCookie(config);
    res.cookie(cookie.name, result.token, { ...cookie.options, expires: result.expiresAt });
    res.json(result.profile);
  });
  router.post('/logout', async (req, res) => {
    const token = readSessionToken(req, config);
    if (token)
      await pool.query(
        'UPDATE sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp()) WHERE token_hash = $1',
        [hashSessionToken(token)],
      );
    clearSessionCookie(res, config);
    res.status(204).end();
  });
  router.get('/me', requireAuth, (req, res) => {
    res.json(req.auth!.user);
  });
  router.post('/change-password', requireAuth, async (req, res) => {
    const body = input(changeSchema, req.body);
    res.json(await changePassword(req.auth!, body.currentPassword, body.newPassword, config));
  });
  return router;
}
